import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { applyImport, buildImportPlan } from './import-database';

const version='20261001202736',name='benchimol_editorial_initial';
const migration=`supabase/migrations/${version}_${name}.sql`;
function ensure(value:unknown,label:string):asserts value { if(!value)throw new Error(label); }

async function main(){
 const sql=await readFile(migration,'utf8'),sha256=createHash('sha256').update(sql).digest('hex');
 const plan=buildImportPlan();
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'plan',migration,sha256,posts:plan.posts.length,canonical:plan.posts.filter(p=>p.public_path).length,media:plan.media.length}));return;}
 const expected=process.argv.find(a=>a.startsWith('--expected-ref='))?.slice('--expected-ref='.length);
 ensure(expected&&expected===process.env.SUPABASE_CLINIC_PROJECT_REF,'Explicit clinic project confirmation required');
 const target=process.env.DATABASE_URL,api=process.env.NEXT_PUBLIC_SUPABASE_URL;
 ensure(target&&api,'Missing clinic configuration');assertClinicTarget(target,true);assertClinicTarget(api,true);
 ensure(new URL(api).hostname===`${expected}.supabase.co`,'Clinic API target mismatch');
 ensure(!['localhost','127.0.0.1'].includes(new URL(target).hostname),'Use the dedicated local workflow for loopback');
 const client=new Client({...await pgConnectionConfig(target),connectionTimeoutMillis:15000,query_timeout:30000});
 await client.connect();
 let committed=false;
 try{
  await client.query('begin');await client.query("set local lock_timeout='5s'");
  await client.query("select pg_advisory_xact_lock(hashtext('benchimol-clinic-initialization'))");
  const ledger=(await client.query("select to_regclass('supabase_migrations.schema_migrations') is not null as present")).rows[0].present;
  if(ledger){
   const previous=await client.query('select version,statements from supabase_migrations.schema_migrations order by version');
   if(previous.rows.length){
    ensure(previous.rows.length===1&&previous.rows[0].version===version&&previous.rows[0].statements?.length===1&&previous.rows[0].statements[0]===sql,'Existing migration history differs; no changes applied');
    await client.query('rollback');console.log(JSON.stringify({mode:'already-initialized',projectRef:expected,migration,sha256,changed:false}));return;
   }
  }
  const tables=await client.query("select count(*)::int as total from pg_tables where schemaname in ('public','private')");
  const buckets=await client.query('select count(*)::int as total from storage.buckets');
  ensure(tables.rows[0].total===0&&buckets.rows[0].total===0,'Database or Storage already occupied; no reset allowed');
  ensure((await client.query("select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage' and p.proname='allow_any_operation') as supported")).rows[0].supported,'Storage operation guard unavailable');
  await client.query(sql);await applyImport(client,plan);
  const actual=await client.query('select wp_id,body_html,source_hash,public_path,slug from public.posts order by wp_id');
  ensure(actual.rows.length===plan.posts.length,'Post count mismatch');
  const originals=new Map(plan.posts.map(p=>[Number(p.wp_id),p]));
  ensure(actual.rows.every(p=>{const source=originals.get(Number(p.wp_id));return source&&p.body_html===source.body_html&&p.source_hash===source.source_hash&&p.public_path===source.public_path&&p.slug===source.slug;}),'Imported bodies or canonical paths differ');
  const counts=(await client.query("select (select count(*)::int from public.posts) as posts,(select count(*)::int from public.posts where public_path is not null) as canonical,(select count(*)::int from public.media where wp_id is not null) as media,(select count(*)::int from public.redirects) as redirects")).rows[0];
  ensure(counts.posts===154&&counts.canonical===153&&counts.media===551&&counts.redirects===plan.redirects.length,'Inventory reconciliation failed');
  const rls=await client.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity");
  ensure(rls.rows.length===0,'An application table lacks RLS');
  const bucket=(await client.query("select public,file_size_limit from storage.buckets where id='editorial-media'")).rows[0];
  ensure(bucket?.public===false&&Number(bucket.file_size_limit)===10485760,'Managed bucket is not private or has wrong limit');
  // Same history columns as Supabase CLI v2.95.0 pkg/migration/history.go.
  await client.query('create schema if not exists supabase_migrations');
  await client.query('create table if not exists supabase_migrations.schema_migrations(version text not null primary key)');
  await client.query('alter table supabase_migrations.schema_migrations add column if not exists statements text[]');
  await client.query('alter table supabase_migrations.schema_migrations add column if not exists name text');
  await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[version,name,[sql]]);
  await client.query("notify pgrst,'reload schema'");await client.query('commit');committed=true;
  const report={createdAt:new Date().toISOString(),projectRef:expected,migration,sha256,committed:true,counts,bodyAndPathReconciliation:true,rlsAllApplicationTables:true,privateBucket:true,authUsersCreated:0,noDocker:true,noSiteDeployment:true};
  await writeFile('docs/validation/clinic-initialization.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(error){if(!committed)await client.query('rollback');throw error;}finally{await client.end();}
}
main().catch(()=>{console.error('Inicialização não concluída. Confira destino, banco vazio, TLS e schema. Credenciais não são exibidas; confira o relatório antes de repetir.');process.exitCode=1;});
