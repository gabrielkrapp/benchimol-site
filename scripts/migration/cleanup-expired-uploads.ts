/** Manual SEC-05 maintenance. Plan by default; never a scheduler or public API. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';

const CLINIC = 'jjrzmuuwuvxcsnwqzvxf';
const HOUR = 3600_000, UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
interface UploadRow { id:string;user_id:string;storage_path:string;created_at:string|Date;bytes:number|string;mime_type:string;media_reference:boolean;post_reference:boolean;revision_reference:boolean;object_present:boolean; }
interface Connection { query(sql:string,values?:any[]):Promise<{rows:any[];rowCount?:number|null}>; }
export function assertCleanupDestination(expected:string,api:string,target:string):void {
 if(expected!==CLINIC||process.env.SUPABASE_CLINIC_PROJECT_REF!==CLINIC)throw new Error('clinic_binding');
 assertClinicTarget(api,true);assertClinicTarget(target,true);
 const a=new URL(api),d=new URL(target);
 if(a.protocol!=='https:'||a.hostname!==`${CLINIC}.supabase.co`||a.username||a.password||a.search||a.hash||!['','/'].includes(a.pathname)||['localhost','127.0.0.1'].includes(d.hostname))throw new Error('clinic_binding');
}
export function buildExpiredUploadPlan(rows:UploadRow[],now=Date.now()) {
 const candidates=rows.filter(row=>{
  const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'} as Record<string,string>)[row.mime_type];
  return UUID.test(row.id)&&UUID.test(row.user_id)&&row.storage_path===`${row.user_id}/${row.id}.${ext}`&&Boolean(ext)&&
   Number.isInteger(Number(row.bytes))&&Number(row.bytes)>0&&Number(row.bytes)<=10485760&&
   Number.isFinite(Date.parse(String(row.created_at)))&&Date.parse(String(row.created_at))<now-4*HOUR&&
   row.media_reference===false&&row.post_reference===false&&row.revision_reference===false&&typeof row.object_present==='boolean';
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const approval=candidates.map(row=>({id:row.id,path:row.storage_path,createdAt:new Date(row.created_at).toISOString(),bytes:Number(row.bytes),mime:row.mime_type,objectPresent:row.object_present}));
 return {candidates,skipped:rows.length-candidates.length,hash:createHash('sha256').update(JSON.stringify(approval)).digest('hex')};
}
const candidatesSql=`select u.id,u.user_id,u.storage_path,u.created_at,u.bytes,u.mime_type,
 exists(select 1 from public.media m where m.id=u.id or m.storage_path=u.storage_path or lower(rtrim(private.media_url_path(m.url),'/'))='/api/media/'||u.id::text) as media_reference,
 exists(select 1 from public.posts p where position(lower(u.id::text) in lower(to_jsonb(p)::text))>0 or position(u.storage_path in to_jsonb(p)::text)>0) as post_reference,
 exists(select 1 from public.post_revisions r where position(lower(u.id::text) in lower(to_jsonb(r)::text))>0 or position(u.storage_path in to_jsonb(r)::text)>0) as revision_reference,
 exists(select 1 from storage.objects o where o.bucket_id='editorial-media' and o.name=u.storage_path) as object_present
 from public.media_uploads u where u.created_at < $1::timestamptz order by u.id`;
export async function readExpiredUploadPlan(client:Connection,now=Date.now()) {
 const result=await client.query(candidatesSql,[new Date(now-4*HOUR).toISOString()]);
 return buildExpiredUploadPlan(result.rows,now);
}
export async function executeExpiredUploadCleanup(client:Connection,removeObjects:(paths:string[])=>Promise<void>,approvedHash:string,now=Date.now()) {
 if(!/^[a-f0-9]{64}$/.test(approvedHash))throw new Error('plan_confirmation_required');
 await client.query('begin');
 try {
  await client.query("set local lock_timeout='5s'");
  // Freeze every reference source before rechecking eligibility. A record's URL
  // may match even if its database ID/path differs; preserve that registration.
  await client.query('lock table public.posts in share mode');
  await client.query('lock table public.post_revisions in share mode');
  // Prevent media registration and competing finalization while rechecking the plan.
  await client.query('lock table public.media in share mode');
  await client.query('lock table public.media_uploads in share row exclusive mode');
  const plan=await readExpiredUploadPlan(client,now);
  if(plan.hash!==approvedHash)throw new Error('plan_changed');
  if(plan.candidates.length>25)throw new Error('manual_batch_review_required');
  const paths=plan.candidates.filter(row=>row.object_present).map(row=>row.storage_path);
  // Storage and SQL are separate systems: deleted bytes cannot be rolled back.
  // A Storage error preserves intentions for diagnosis/retry; do not claim atomic byte rollback.
  if(paths.length)await removeObjects(paths);
  let deletedIntents=0;
  for(const row of plan.candidates){
   const result=await client.query('delete from public.media_uploads where id=$1 and storage_path=$2 and created_at<$3::timestamptz',[row.id,row.storage_path,new Date(now-4*HOUR).toISOString()]);
   if(result.rowCount!==1)throw new Error('intent_changed');deletedIntents++;
  }
  await client.query('commit');return {deletedIntents,deletedObjects:paths.length};
 }catch(error){await client.query('rollback');throw error;}
}
async function main() {
 const expected=process.argv.find(a=>a.startsWith('--expected-ref='))?.slice('--expected-ref='.length)??'';
 const api=process.env.NEXT_PUBLIC_SUPABASE_URL??'',target=process.env.DATABASE_URL??'';
 assertCleanupDestination(expected,api,target);
 const execute=process.argv.includes('--execute'),confirmed=process.argv.find(a=>a.startsWith('--confirm-plan='))?.slice('--confirm-plan='.length);
 if(execute&&!confirmed)throw new Error('plan_confirmation_required');
 const client=new Client({...await pgConnectionConfig(target),application_name:'benchimol-manual-expired-upload-cleanup',connectionTimeoutMillis:15000,query_timeout:30000});
 await client.connect();
 try {
  if(!execute){
   await client.query('begin read only');const plan=await readExpiredUploadPlan(client);await client.query('rollback');
   const folder=resolve('backups/expired-upload-cleanup');await mkdir(folder,{recursive:true,mode:0o700});
   const output=resolve(folder,`plan-${Date.now()}.json`);
   await writeFile(output,JSON.stringify({createdAt:new Date().toISOString(),projectRef:CLINIC,...plan},null,2)+'\n',{mode:0o600});
   console.log(JSON.stringify({mode:'plan',projectRef:CLINIC,candidates:plan.candidates.length,protected:plan.skipped,approvalHash:plan.hash,privateManifest:output,storageDeletes:0,databaseDeletes:0}));return;
  }
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('private_storage_configuration');
  const storage=createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
  const result=await executeExpiredUploadCleanup(client,async paths=>{const removed=await storage.storage.from('editorial-media').remove(paths);if(removed.error)throw new Error('storage_delete_failed');},confirmed!);
  console.log(JSON.stringify({mode:'executed',projectRef:CLINIC,...result}));
 } finally {await client.end();}
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Limpeza não concluída. Confira projeto, plano exato e referências. Em falha após exclusão Storage, intenções podem permanecer para revisão; detalhes privados não são exibidos.');process.exitCode=1;});
