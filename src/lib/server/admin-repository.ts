import type { Post, PostFilters,PageResult,Media,Dashboard,Taxonomy,PublicSettings,ContactRevision } from '@/lib/domain/types';
import { requireAdmin } from './auth';
import { databaseError,AppError } from './errors';
import { mapPost,mapRevision,mapMedia,mapSettings,DbRow } from './mappers';
import { pagination } from './public-repository';
import { isPopupVisible } from '@/lib/domain/validation';
import { normalizePlainText } from '@/lib/domain/sanitize';
import routeDecisions from '../../../data/wordpress/route-decisions.json';
export async function getAdminPosts(filters:PostFilters={},order:'updatedAt'|'publishedAt'='updatedAt'):Promise<PageResult<Post>> {
 const {client}=await requireAdmin(),{page,pageSize,start}=pagination(filters);
 let query=client.from('posts').select('*',{count:'exact'});
 if(filters.status)query=query.eq('status',filters.status);
 if(filters.category)query=query.contains('category_ids',[filters.category]);
 if(filters.q)query=query.ilike('title',`%${filters.q.replace(/[%_\\]/g,'')}%`);
 const {data,error,count}=await query.order(order==='publishedAt'?'published_at':'updated_at',{ascending:false,nullsFirst:false}).order('id').range(start,start+pageSize-1);
 if(error)databaseError(error);return {items:(data??[]).map(mapPost),total:count??0,page,pageSize};
}
export async function getAdminPost(id:string):Promise<Post|null> {
 const {client}=await requireAdmin();const {data,error}=await client.from('posts').select('*').eq('id',id).maybeSingle();
 if(error)databaseError(error);return data?mapPost(data):null;
}
export async function getAdminRevisions(id:string) {
 const {client}=await requireAdmin();const {data,error}=await client.from('post_revisions').select('*').eq('post_id',id).order('version',{ascending:false});
 if(error)databaseError(error);return (data??[]).map(mapRevision);
}
export async function getAdminSettings():Promise<PublicSettings> {
 const {client}=await requireAdmin();const {data,error}=await client.from('settings').select('*');if(error)databaseError(error);
 try{return mapSettings(data??[]);}catch{throw new AppError(503,'unavailable','Configurações indisponíveis.');}
}
export async function getContactRevisions():Promise<ContactRevision[]> {
 const {client}=await requireAdmin();const revisions:ContactRevision[]=[];
 for(let start=0;;start+=1000){
  const {data,error}=await client.from('settings_revisions').select('*').eq('key','contact').order('version',{ascending:false}).range(start,start+999);if(error)databaseError(error);
  for(const row of data??[])revisions.push({id:row.id,version:row.version,createdAt:row.created_at,actorName:normalizePlainText(row.actor_name),snapshot:{whatsapp:row.snapshot.value.whatsapp,message:normalizePlainText(row.snapshot.value.message),version:row.snapshot.version,updatedAt:row.snapshot.updated_at}});
  if((data??[]).length<1000)break;
 }
 return revisions;
}
export async function getAdminTaxonomies():Promise<{categories:Taxonomy[];tags:Taxonomy[]}> {
 const {client}=await requireAdmin();const {data,error}=await client.from('taxonomies').select('*').order('name');if(error)databaseError(error);
 // Administrative counts include all editorial states and therefore must remain private.
 const all:DbRow[]=[];for(let start=0;;start+=1000){const r=await client.from('posts').select('category_ids,tag_ids').range(start,start+999);if(r.error)databaseError(r.error);all.push(...r.data);if(r.data.length<1000)break;}
 const map=(kind:string)=>(data??[]).filter(t=>t.kind===kind).map(t=>({wpId:t.wp_id,slug:t.slug,name:t.name,count:all.filter(p=>(kind==='category'?p.category_ids:p.tag_ids).includes(t.wp_id)).length}));
 return {categories:map('category'),tags:map('tag')};
}
async function mediaUses(client:Awaited<ReturnType<typeof requireAdmin>>['client'],urls:string[]) {
 // Exhaustive references include trash and old revisions so restoration remains intact.
 const posts:DbRow[]=[];for(let start=0;;start+=1000){const r=await client.from('posts').select('id,title,body_html,featured_image,seo').range(start,start+999);if(r.error)databaseError(r.error);posts.push(...r.data);if(r.data.length<1000)break;}
 const revisions:DbRow[]=[];for(let start=0;;start+=1000){const r=await client.from('post_revisions').select('post_id,snapshot').range(start,start+999);if(r.error)databaseError(r.error);revisions.push(...r.data);if(r.data.length<1000)break;}
 const referenced=(post:DbRow,url:string)=>post.featured_image===url||post.body_html.includes(url)||mediaUrlPath(post.seo?.ogImage)===url;
 return new Map(urls.map(url=>[url,[...posts.filter(p=>referenced(p,url)).map(p=>({postId:p.id,title:p.title})),...revisions.filter(r=>referenced(r.snapshot,url)).map(r=>({postId:r.post_id,title:`${r.snapshot.title} (revisão)`}))].filter((v,i,arr)=>arr.findIndex(x=>x.postId===v.postId)===i)]));
}
function mediaUrlPath(value:unknown):string|null {if(typeof value!=='string')return null;try{return new URL(value,'https://clinicadeolhosbenchimol.com.br').pathname;}catch{return null;}}
export async function getAdminMedia(filters:Pick<PostFilters,'q'|'page'|'pageSize'>={}):Promise<PageResult<Media>> {
 const {client}=await requireAdmin(),{page,pageSize,start}=pagination(filters);
 let query=client.from('media').select('*',{count:'exact'});
 if(filters.q)query=query.ilike('alt',`%${filters.q.replace(/[%_\\]/g,'')}%`);
 const {data,error,count}=await query.order('created_at',{ascending:false}).order('id').range(start,start+pageSize-1);if(error)databaseError(error);
 const uses=await mediaUses(client,(data??[]).map(m=>m.url));
 return {items:(data??[]).map(m=>mapMedia(m,uses.get(m.url))),total:count??0,page,pageSize};
}
export async function getDashboard():Promise<Dashboard> {
 const {client}=await requireAdmin(),checkedAt=new Date().toISOString();
 const [published,draft,trashed,recent,settings,lastExport,lastRestore,attention]=await Promise.all([
  client.from('posts').select('id',{count:'exact',head:true}).eq('status','published').not('public_path','is',null).not('published_at','is',null).lte('published_at',checkedAt),client.from('posts').select('id',{count:'exact',head:true}).eq('status','draft'),client.from('posts').select('id',{count:'exact',head:true}).eq('status','trashed'),
  client.from('posts').select('*').order('updated_at',{ascending:false}).limit(5),getAdminSettings(),client.from('operation_events').select('*').eq('kind','export').order('created_at',{ascending:false}).limit(1),client.from('operation_events').select('*').eq('kind','restore').order('created_at',{ascending:false}).limit(1),
  client.from('posts').select('id,wp_id,title,featured_image,featured_alt,publication_sync,public_path,status,body_edit_mode,published_at').neq('status','trashed'),
 ]);
 for(const result of [published,draft,trashed,recent,lastExport,lastRestore,attention])if(result.error)databaseError(result.error);
 let bytes=0,items=0;for(let start=0;;start+=1000){const result=await client.from('media').select('bytes').range(start,start+999);if(result.error)databaseError(result.error);for(const m of result.data){bytes+=Number(m.bytes);items++;}if(result.data.length<1000)break;}
 const warnings:Dashboard['warnings']=[];
 for(const p of attention.data??[]){if(p.status==='published'&&(!p.published_at||Date.parse(p.published_at)>Date.now()))warnings.push({postId:p.id,message:`${p.title}: não está público; exibição aguardando data de publicação ${p.published_at??'não informada'}.`});if(!p.featured_image)warnings.push({postId:p.id,message:`${p.title}: sem capa.`});else if(!p.featured_alt)warnings.push({postId:p.id,message:`${p.title}: capa sem texto alternativo.`});if(p.body_edit_mode==='legacy')warnings.push({postId:p.id,message:`${p.title}: conversão do corpo depende de revisão; metadados continuam editáveis.`});if(p.publication_sync==='pending')warnings.push({postId:p.id,message:`${p.title}: atualização pública pendente.`});if(p.status==='published'&&!p.public_path)warnings.push({postId:p.id,message:routeDecisions.duplicates.some(d=>d.wpId===p.wp_id)?`${p.title}: registro legado duplicado preservado; a URL redireciona para a versão canônica conforme a decisão de migração.`:`${p.title}: URL ainda depende de decisão de migração.`});}
 if(settings.popup.active&&settings.popup.endsAt&&Date.parse(settings.popup.endsAt)<=Date.now())warnings.push({message:'Aviso ativo com período encerrado.'});
 return {counts:{published:published.count??0,draft:draft.count??0,trashed:trashed.count??0},recentPosts:(recent.data??[]).map(mapPost),settings,storage:{bytes,items,source:'Mídias cadastradas no aplicativo; não é quota total do provedor.',checkedAt},backup:{lastExportAt:lastExport.data?.[0]?.created_at??null,lastRestoreAt:lastRestore.data?.[0]?.created_at??null,source:'Eventos registrados após operação manual; arquivos exigem backup separado.'},warnings,checkedAt};
}
