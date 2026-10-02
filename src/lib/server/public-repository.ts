import { isPostPublic } from '@/lib/domain/validation';
import type { Post,PostFilters,PageResult,PublicSettings,Taxonomy } from '@/lib/domain/types';
import { canUseSnapshot } from './config';
import { publicClient } from './supabase';
import { AppError,databaseError } from './errors';
import { mapPost,mapSettings,DbRow } from './mappers';
import { snapshotPosts,snapshotSettings,snapshotTaxonomies,snapshotRedirect } from './snapshot';
import { cache } from 'react';
// Raw legacy body remains server-side data; ArticleBody is the mandatory output sanitizer.
function publicPost(row:DbRow):Post {return {...mapPost(row),bodyHtml:row.body_html};}
export function pagination(filters:PostFilters={}) {
 const page=Number.isFinite(filters.page)?Math.max(1,Math.floor(filters.page!)):1;
 const pageSize=Number.isFinite(filters.pageSize)?Math.min(100,Math.max(1,Math.floor(filters.pageSize!))):12;
 return {page,pageSize,start:(page-1)*pageSize};
}
export async function getPublicPosts(filters:PostFilters={},now=new Date()):Promise<PageResult<Post>> {
 const {page,pageSize,start}=pagination(filters);
 if(canUseSnapshot()) {
  const all=(await snapshotPosts()).filter(p=>isPostPublic(p,now) && (!filters.category || p.categoryIds.includes(filters.category)) && (!filters.tag||p.tagIds.includes(filters.tag)) && (!filters.author||p.authorName===filters.author) && (!filters.q||p.title.toLocaleLowerCase('pt-BR').includes(filters.q.toLocaleLowerCase('pt-BR')))).sort((a,b)=>(b.publishedAt??'').localeCompare(a.publishedAt??''));
  return {items:all.slice(start,start+pageSize),total:all.length,page,pageSize};
 }
 const client=publicClient(); let query=client.from('posts').select('*',{count:'exact'}).eq('status','published').not('public_path','is',null).not('published_at','is',null).lte('published_at',now.toISOString());
 if(filters.category) query=query.contains('category_ids',[filters.category]);
 if(filters.tag) query=query.contains('tag_ids',[filters.tag]);
 if(filters.author) query=query.eq('author_name',filters.author);
 if(filters.q) query=query.ilike('title',`%${filters.q.replace(/[%_\\]/g,'')}%`);
 const {data,error,count}=await query.order('published_at',{ascending:false}).order('id').range(start,start+pageSize-1);
 if(error) databaseError(error);
 return {items:(data??[]).map(publicPost),total:count??0,page,pageSize};
}
export async function getAllPublicPosts(now=new Date()):Promise<Post[]> {
 const result:Post[]=[]; let page=1;
 while(true) {const batch=await getPublicPosts({page,pageSize:100},now); result.push(...batch.items); if(result.length>=batch.total || batch.items.length===0) return result;page++;}
}
export async function getPublicPostByPath(path:string,now=new Date()):Promise<Post|null> {
 const clean=`/${path.replace(/^\/+|\/+$/g,'')}/`;
 if(canUseSnapshot()) return (await snapshotPosts()).find(p=>p.legacyPath===clean && isPostPublic(p,now))??null;
 const {data,error}=await publicClient().from('posts').select('*').eq('public_path',clean).eq('status','published').not('published_at','is',null).lte('published_at',now.toISOString()).maybeSingle();
 if(error) databaseError(error); return data?publicPost(data):null;
}
export async function getPublicRedirect(path:string):Promise<string|null> {
 if(canUseSnapshot()){const target=snapshotRedirect(path);return target&&await getPublicPostByPath(target)?target:null;}
 const {data,error}=await publicClient().from('redirects').select('to_path').eq('from_path',path).maybeSingle();
 if(error) databaseError(error);return data?.to_path ?? null;
}
export async function getPublicSettings():Promise<PublicSettings> {
 if(canUseSnapshot()) return snapshotSettings();
 const {data,error}=await publicClient().from('settings').select('*'); if(error) databaseError(error);
 try {return mapSettings(data??[]);} catch {throw new AppError(503,'unavailable','Configurações públicas indisponíveis.');}
}
export const getTaxonomies = cache(async ():Promise<{categories:Taxonomy[];tags:Taxonomy[]}> => {
 if(canUseSnapshot()) return snapshotTaxonomies();
 const client=publicClient(), now=new Date();
 const membership = async () => {
  const rows:DbRow[]=[];
  // Page through narrow public membership records, never HTML bodies or drafts.
  // Explicit predicates complement RLS and also cover an oversized future blog.
  for(let start=0;;start+=1000) {
   const {data,error}=await client.from('posts').select('id,category_ids,tag_ids').eq('status','published').not('public_path','is',null).not('published_at','is',null).lte('published_at',now.toISOString()).order('id').range(start,start+999);
   if(error) databaseError(error); rows.push(...(data??[]));
   if((data??[]).length<1000) return rows;
  }
 };
 const [{data,error},posts]=await Promise.all([client.from('taxonomies').select('wp_id,slug,name,kind').order('name'),membership()]);
 if(error) databaseError(error);
 const map=(kind:string)=> (data??[]).filter(t=>t.kind===kind).map(t=>({wpId:t.wp_id,slug:t.slug,name:t.name,count:posts.filter(p=>(kind==='category'?p.category_ids:p.tag_ids).includes(t.wp_id)).length}));
 return {categories:map('category'),tags:map('tag')};
});
