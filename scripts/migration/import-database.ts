import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { stat,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import posts from '../../data/wordpress/posts.json';
import media from '../../data/wordpress/media.json';
import categories from '../../data/wordpress/categories.json';
import tags from '../../data/wordpress/tags.json';
import pages from '../../data/wordpress/pages.json';
import site from '../../data/wordpress/site.json';
import decisions from '../../data/wordpress/route-decisions.json';
import routes from '../../data/wordpress/routes.json';
import { classifyBodyEditMode } from '../../src/lib/domain/validation';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { importedSeoText } from '../../src/lib/domain/imported-seo';
import type { SeoFields } from '../../src/lib/domain/types';

export const stableId=(kind:string,wpId:number)=>{const hex=createHash('sha256').update(`benchimol:${kind}:${wpId}`).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;};
const utc=(input:string|undefined)=>input?`${input.replace(/Z$/,'')}Z`:null;
export function buildImportPlan() {
 const aliases=new Map(decisions.decisions.filter(d=>d.approvedBy==='Gabriel Krapp'&&d.approvedAt).map(d=>[d.wpId,d.publicPath]));
 const duplicates=new Map(decisions.duplicates.map(d=>[d.wpId,d.canonicalPath]));
 const rows=posts.map(post=>{
  const asset=media.find(m=>m.wpId===post.featuredMediaId),alias=aliases.get(post.wpId);
  const publicPath=duplicates.has(post.wpId)||Object.hasOwn(site.collisions,post.path)&&!alias?null:alias??post.path;
  return {id:stableId('post',post.wpId),wp_id:post.wpId,slug:(alias??post.path).slice(1,-1),legacy_path:post.path,public_path:publicPath,title:post.title,excerpt_html:post.excerptHtml,body_html:post.contentHtml,
  author_name:post.seo.author??'Clínica de Olhos Benchimol',status:post.status==='publish'?'published':'draft',published_at:utc(post.publishedAtGmt),created_at:utc(post.publishedAtGmt),updated_at:utc(post.modifiedAtGmt),
  version:1,featured_image:asset?.localPath??null,featured_alt:asset?.alt??'',category_ids:post.categoryIds,tag_ids:post.tagIds,
  seo:{title:importedSeoText(post.seo.title??post.title),description:importedSeoText(post.seo.description??post.seo.og_description??''),canonical:alias||duplicates.has(post.wpId)?`${site.source}${alias??duplicates.get(post.wpId)}`:post.originalUrl},
  body_edit_mode:classifyBodyEditMode(post.contentHtml),publication_sync:'current',source_hash:post.sourceRecordSha256};
 });
 const redirects=routes.filter(r=>r.finalUrl!==r.url).map(r=>{const to=new URL(r.finalUrl).pathname,post=rows.find(p=>p.public_path===to);return post&&/^\/[a-z0-9-]+\/$/.test(r.path)&&/^\/[a-z0-9-]+\/$/.test(to)?{from_path:r.path,to_path:to,post_id:post.id}:null;}).filter((r):r is NonNullable<typeof r>=>Boolean(r));
 const taxonomy=[...categories.map(t=>({kind:'category',wp_id:t.wpId,name:t.name,slug:t.slug})),...tags.map(t=>({kind:'tag',wp_id:t.wpId,name:t.name,slug:t.slug}))];
 const reserved=[...new Set(['/admin/','/api/','/category/','/tag/','/wp-admin/','/wp-json/','/wp-content/',...pages.map(p=>p.path)])];
 return {posts:rows,redirects,taxonomies:taxonomy,reserved,media};
}
export type ImportPlan=ReturnType<typeof buildImportPlan>;
export interface LegacySeoRepair { id:string;wpId:number;sourceHash:string;version:1;before:SeoFields;after:SeoFields; }
/** Origin-bound plan only; running/importing this module never repairs an existing DB. */
export function buildLegacySeoRepairPlan():LegacySeoRepair[] {
 return buildImportPlan().posts.flatMap(row=>{
  const source=posts.find(post=>post.wpId===row.wp_id)!;
  const before:SeoFields={title:source.seo.title??source.title,description:source.seo.description??source.seo.og_description??'',canonical:row.seo.canonical};
  return before.title===row.seo.title && before.description===row.seo.description ? [] : [{id:row.id,wpId:row.wp_id,sourceHash:row.source_hash,version:1 as const,before,after:row.seo}];
 });
}
function exactSeo(value:unknown,expected:SeoFields):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const actual=value as Record<string,unknown>,keys=Object.keys(expected);
 return Object.keys(actual).length===keys.length&&keys.every(key=>actual[key]===expected[key as keyof SeoFields]);
}
/** Never overwrite a post changed after import or carrying different source/SEO. */
export function legacySeoRepairState(row:Record<string,unknown>,repair:LegacySeoRepair):'pending'|'already_repaired'|'conflict' {
 if(row.id!==repair.id||row.wp_id!==repair.wpId||row.version!==repair.version||row.source_hash!==repair.sourceHash)return 'conflict';
 return exactSeo(row.seo,repair.before)?'pending':exactSeo(row.seo,repair.after)?'already_repaired':'conflict';
}
export interface SqlConnection { query(sql:string,values?:any[]):Promise<any>; }
async function insert(client:SqlConnection,table:string,row:Record<string,unknown>,conflict:string) {
 const keys=Object.keys(row),values=Object.values(row).map(v=>typeof v==='object'&&v!==null&&!Array.isArray(v)?JSON.stringify(v):v);
 await client.query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')}) ${conflict ? `on conflict ${conflict} do nothing` : ''}`,values);
}
export async function applyImport(client:SqlConnection,plan:ImportPlan) {
 for(const path of plan.reserved)await insert(client,'reserved_routes',{path},'(path)');
 for(const row of plan.taxonomies)await insert(client,'taxonomies',row,'(kind,wp_id)');
 for(const asset of plan.media){
  const publicRoot=resolve('public'),file=resolve(publicRoot,`.${asset.localPath}`);
  if(!file.startsWith(`${publicRoot}/`))throw new Error('Invalid media path in source inventory');
  const bytes=(await stat(file)).size;
  await insert(client,'media',{id:stableId('media',asset.wpId),wp_id:asset.wpId,url:asset.localPath,original_url:asset.originalUrl,storage_path:null,mime_type:asset.mimeType,bytes,width:asset.details.width??null,height:asset.details.height??null,alt:asset.alt,caption:asset.captionHtml},'(wp_id)');
 }
 // Original bodies remain byte-for-byte in DB; renderers sanitize at output/edit boundaries.
 // Only verified legacy SEO text is decoded once in the import plan above.
 for(const row of plan.posts)await insert(client,'posts',row,'(wp_id)');
 for(const row of plan.redirects)await insert(client,'redirects',row,'(from_path)');
 const query=await client.query('select count(*)::integer as total from public.posts where wp_id=any($1::bigint[])',[plan.posts.map(p=>p.wp_id)]);
 if(query.rows[0].total!==plan.posts.length)throw new Error('Import reconciliation failed');
 await insert(client,'operation_events',{kind:'import',source:'Sanitized public/WXR normalized inventory; WP IDs preserved',details:{posts:plan.posts.length,publicArticles:plan.posts.filter(p=>p.public_path).length,media:plan.media.length}},'');
}
async function main() {
 const plan=buildImportPlan();
 const summary={mode:process.argv.includes('--execute')?'execute':'plan',posts:plan.posts.length,canonicalArticles:plan.posts.filter(p=>p.public_path).length,media:plan.media.length,redirects:plan.redirects.length,bodyModes:plan.posts.reduce((a,p)=>({...a,[p.body_edit_mode]:a[p.body_edit_mode]+1}),{rich:0,legacy:0})};
 if(!process.argv.includes('--execute')){console.log(JSON.stringify(summary,null,2));return;}
 const target=process.env.DATABASE_URL;if(!target)throw new Error('DATABASE_URL required');assertClinicTarget(target,true);
 const client=new Client(await pgConnectionConfig(target));await client.connect();
 try{await client.query('begin');await applyImport(client,plan);await client.query('commit');console.log(JSON.stringify(summary,null,2));}catch(error){await client.query('rollback');throw error;}finally{await client.end();}
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Importação não concluída. Verifique configuração, schema e inventário; detalhes de conexão não são exibidos.');process.exitCode=1;});
