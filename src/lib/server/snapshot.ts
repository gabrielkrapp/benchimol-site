import posts from '../../../data/wordpress/posts.json';
import media from '../../../data/wordpress/media.json';
import categories from '../../../data/wordpress/categories.json';
import tags from '../../../data/wordpress/tags.json';
import site from '../../../data/wordpress/site.json';
import routes from '../../../data/wordpress/routes.json';
import routeDecisions from '../../../data/wordpress/route-decisions.json';
import { classifyBodyEditMode } from '@/lib/domain/validation';
import type { Post,PublicSettings,Taxonomy } from '@/lib/domain/types';
import { sanitizeBodyHtml,sanitizeExcerptHtml,normalizePlainText } from '@/lib/domain/sanitize';
import { importedSeoText } from '@/lib/domain/imported-seo';
/** Only decisions explicitly approved by the user may create aliases. Missing file means no alias. */
export async function approvedAliases():Promise<Record<string,string>> {
 try {
  const raw=routeDecisions;
  return Object.fromEntries((raw.decisions ?? []).filter((d:any)=>d.approvedBy==='Gabriel Krapp' && Boolean(d.approvedAt) && Number.isInteger(d.wpId) && /^\/[a-z0-9-]+\/$/.test(d.publicPath)).map((d:any)=>[String(d.wpId),d.publicPath]));
 } catch(error) {if((error as NodeJS.ErrnoException).code==='ENOENT') return {};throw error;}
}
const utc=(value:string|undefined)=>value ? `${value.replace(/Z$/,'')}Z` : null;
export function mapSnapshotPost(record:(typeof posts)[number],aliases:Record<string,string>={}):Post {
 const asset=media.find(m=>m.wpId===record.featuredMediaId);
 const path=aliases[String(record.wpId)] ?? record.path;
 return { id:`wp-${record.wpId}`,wpId:record.wpId,slug:path.slice(1,-1),legacyPath:path,title:normalizePlainText(record.title),
 excerptHtml:sanitizeExcerptHtml(record.excerptHtml),bodyHtml:record.contentHtml,authorName:record.seo.author ?? 'Clínica de Olhos Benchimol',status:record.status==='publish'?'published':'draft',
 publishedAt:utc(record.publishedAtGmt),createdAt:utc(record.publishedAtGmt)!,updatedAt:utc(record.modifiedAtGmt)!,version:1,
 featuredImage:asset?.localPath ?? null,featuredAlt:asset?.alt ?? '',categoryIds:record.categoryIds,tagIds:record.tagIds,
 seo:{title:importedSeoText(record.seo.title ?? record.title),description:importedSeoText(record.seo.description ?? record.seo.og_description ?? ''),canonical:aliases[String(record.wpId)]||routeDecisions.duplicates.some(d=>d.wpId===record.wpId) ? `${site.source}${aliases[String(record.wpId)]??routeDecisions.duplicates.find(d=>d.wpId===record.wpId)!.canonicalPath}` : record.originalUrl},
 bodyEditMode:classifyBodyEditMode(record.contentHtml),publicationSync:'current' };
}
export async function snapshotPosts():Promise<Post[]> {
 const aliases=await approvedAliases();
 const decisions=routeDecisions;
 const shadowed=new Set([...(decisions.pending??[]),...(decisions.duplicates??[])].map((d:any)=>d.wpId));
 return posts.filter(p=>!shadowed.has(p.wpId)).filter(p=>!Object.hasOwn(site.collisions,p.path)||Boolean(aliases[String(p.wpId)])).map(p=>mapSnapshotPost(p,aliases));
}
export function snapshotSettings():PublicSettings {
 // Observed footer contact; popup inactive until clinic supplies an approved notice.
 return {contact:{whatsapp:'5521985601000',message:'Olá, encontrei o site da Clínica de Olhos Benchimol em uma busca e gostaria de mais informações',version:1,updatedAt:site.capturedAt},popup:{title:'',text:'',active:false,startsAt:null,endsAt:null,version:1,updatedAt:site.capturedAt},source:'snapshot'};
}
export function snapshotTaxonomies():{categories:Taxonomy[];tags:Taxonomy[]} {
 const map=(rows:typeof categories)=>rows.map(t=>({wpId:t.wpId,name:t.name,slug:t.slug,count:t.count}));
 return {categories:map(categories),tags:map(tags)};
}

export function snapshotRedirect(path:string):string|null {
 const route=routes.find(r=>r.path===path&&r.finalUrl!==r.url);
 if(!route)return null;const target=new URL(route.finalUrl);return target.origin===site.source?target.pathname:null;
}
