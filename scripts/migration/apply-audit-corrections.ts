import { Client } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { buildLegacySeoRepairPlan, legacySeoRepairState, type LegacySeoRepair, type SqlConnection } from './import-database';

export const CLINIC_REF = 'jjrzmuuwuvxcsnwqzvxf';
const INITIAL_VERSION = '20261001202736', INITIAL_NAME = 'benchimol_editorial_initial';
const VERSION = '20261002032930', NAME = 'benchimol_least_privilege';
const TABLES = ['public.administrators','public.media','public.media_uploads','public.operation_events','public.post_revisions','public.posts','public.redirects','public.reserved_routes','public.settings','public.settings_revisions','public.taxonomies','private.login_windows'] as const;
const CLIENT_ROLES = ['anon','authenticated','service_role'] as const;
const PRIVILEGES = ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] as const;
type Row = Record<string,any>;
function ensure(value:unknown,code:string):asserts value { if(!value)throw new Error(code); }
function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value as Row).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value)??'null';
}
export const digest = (value:unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const sqlDigest = (sql:string) => createHash('sha256').update(sql).digest('hex');
export interface AuditMaterial { initialSql:string;sql:string;initialSha256:string;sha256:string;repairs:LegacySeoRepair[]; }
export async function readAuditMaterial():Promise<AuditMaterial> {
  const initialSql=await readFile(`supabase/migrations/${INITIAL_VERSION}_${INITIAL_NAME}.sql`,'utf8');
  const sql=await readFile(`supabase/migrations/${VERSION}_${NAME}.sql`,'utf8'),schema=await readFile('supabase/schemas/05_least_privilege.sql','utf8');
  ensure(sql===schema,'generated_migration_schema_mismatch');
  return {initialSql,sql,initialSha256:sqlDigest(initialSql),sha256:sqlDigest(sql),repairs:buildLegacySeoRepairPlan()};
}
export interface AuditSnapshot {
  contents:Record<string,Row[]>;fingerprints:Record<string,{rows:number;sha256:string}>;postsWithoutSeo:{rows:number;sha256:string};
  postIdentities:Row[];ledger:Row[];catalog:{tables:Row[];tablePrivileges:Row[];columnPrivileges:Row[];functions:Row[];policies:Row[];triggers:Row[];schemas:Row[];defaults:Row[];buckets:Row[];providerAclSha256:string};
}

/** SELECT only. Never include contents/postIdentities in a public report. */
export async function collectAuditSnapshot(client:SqlConnection):Promise<AuditSnapshot> {
  const query=async(sql:string,values?:any[])=>(await client.query(sql,values)).rows as Row[];
  const contents:Record<string,Row[]>={},fingerprints:AuditSnapshot['fingerprints']={};
  for(const table of TABLES){
    const rows=(await query(`select to_jsonb(t) as row from ${table} t order by to_jsonb(t)::text`)).map(result=>result.row as Row);
    contents[table]=rows;fingerprints[table]={rows:rows.length,sha256:digest(rows.map(canonical).sort())};
  }
  const postsWithoutSeo={rows:contents['public.posts'].length,sha256:digest(contents['public.posts'].map(({seo:_,...rest})=>canonical(rest)).sort())};
  const postIdentities=await query('select id,wp_id::integer as wp_id,source_hash,version,seo from public.posts where wp_id is not null order by wp_id');
  const ledger=await query('select version,name,statements from supabase_migrations.schema_migrations order by version');
  const tables=await query(`select n.nspname as schema,c.relname as name,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,pg_get_userbyid(c.relowner) as owner
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' order by n.nspname,c.relname`);
  ensure(tables.length===TABLES.length&&tables.every(table=>TABLES.includes(`${table.schema}.${table.name}` as typeof TABLES[number])&&table.rls===true),'application_table_rls_mismatch');
  const tablePrivileges=await query(`select n.nspname as schema,c.relname as name,r.role,p.privilege,has_table_privilege(r.role,c.oid,p.privilege) as allowed
    from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join unnest($1::text[]) r(role) cross join unnest($2::text[]) p(privilege)
    where n.nspname in('public','private') and c.relkind='r' order by n.nspname,c.relname,r.role,p.privilege`,[CLIENT_ROLES,PRIVILEGES]);
  const columnPrivileges=await query(`select n.nspname as schema,c.relname as name,a.attname as column,r.role,p.privilege,has_column_privilege(r.role,c.oid,a.attnum,p.privilege) as allowed
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid cross join unnest($1::text[]) r(role) cross join unnest(array['SELECT','INSERT','UPDATE']) p(privilege)
    where n.nspname in('public','private') and c.relkind='r' and a.attnum>0 and not a.attisdropped order by n.nspname,c.relname,a.attnum,r.role,p.privilege`,[CLIENT_ROLES]);
  const functionRows=await query(`select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef as security_definer,p.proconfig as config,pg_get_functiondef(p.oid) as definition,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' order by n.nspname,p.proname,p.oid`);
  const functions=functionRows.map(({definition,...row})=>({...row,definitionSha256:sqlDigest(definition)}));
  const policies=await query("select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in('public','private','storage') order by schemaname,tablename,policyname");
  const triggerRows=await query(`select n.nspname as schema,c.relname as name,t.tgname as trigger,t.tgenabled as enabled,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and not t.tgisinternal order by n.nspname,c.relname,t.tgname`);
  const triggers=triggerRows.map(({definition,...row})=>({...row,definitionSha256:sqlDigest(definition)}));
  const schemas=await query(`select nspname as schema,has_schema_privilege('anon',oid,'USAGE') as anon_usage,has_schema_privilege('authenticated',oid,'USAGE') as authenticated_usage,
    has_schema_privilege('anon',oid,'CREATE') as anon_create,has_schema_privilege('authenticated',oid,'CREATE') as authenticated_create from pg_namespace where nspname in('public','private','auth','storage') order by nspname`);
  const defaults=await query(`select pg_get_userbyid(d.defaclrole) as owner,coalesce(n.nspname,'') as schema,d.defaclobjtype as type,coalesce(r.rolname,'PUBLIC') as grantee,x.privilege_type,x.is_grantable
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace cross join lateral aclexplode(d.defaclacl) x left join pg_roles r on r.oid=x.grantee
    order by owner,schema,type,grantee,x.privilege_type,x.is_grantable`);
  const buckets=await query('select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id');
  const providerAcl=await query(`select 'table' as kind,n.nspname as schema,c.relname as name,c.relacl::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('auth','storage') and c.relkind in('r','p','v','m')
    union all select 'function',n.nspname,p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('auth','storage') order by kind,schema,name`);
  return {contents,fingerprints,postsWithoutSeo,postIdentities,ledger,catalog:{tables,tablePrivileges,columnPrivileges,functions,policies,triggers,schemas,defaults,buckets,providerAclSha256:digest(providerAcl)}};
}

function ledgerPending(snapshot:AuditSnapshot,material:AuditMaterial):boolean {
  const expected=snapshot.ledger;
  ensure(expected.length===1||expected.length===2,'migration_ledger_unexpected');
  ensure(expected[0].version===INITIAL_VERSION&&expected[0].name===INITIAL_NAME&&expected[0].statements?.length===1&&expected[0].statements[0]===material.initialSql,'initial_migration_mismatch');
  if(expected.length===2)ensure(expected[1].version===VERSION&&expected[1].name===NAME&&expected[1].statements?.length===1&&expected[1].statements[0]===material.sql,'hardening_migration_mismatch');
  return expected.length===1;
}
function currentRepairs(snapshot:AuditSnapshot,material:AuditMaterial){
  const pending:LegacySeoRepair[]=[],alreadyRepaired:number[]=[],skippedEditedWpIds:number[]=[];
  for(const repair of material.repairs){
    const row=snapshot.postIdentities.find(post=>post.wp_id===repair.wpId);ensure(row,'legacy_post_missing');
    ensure(row.id===repair.id&&row.source_hash===repair.sourceHash,'legacy_source_identity_mismatch');
    if(Number.isInteger(row.version)&&row.version>1){skippedEditedWpIds.push(repair.wpId);continue;}
    const state=legacySeoRepairState(row,repair);ensure(state!=='conflict','legacy_seo_conflict');
    if(state==='pending')pending.push(repair);else alreadyRepaired.push(repair.wpId);
  }
  return {pending,alreadyRepaired,skippedEditedWpIds};
}
export interface AuditPlan {
  hash:string;summary:{mode:'plan';readOnly:true;projectRef:string;migrationSha256:string;initialMigrationSha256:string;migrationPending:boolean;pendingSeo:number;alreadyRepairedSeo:number;skippedEditedWpIds:number[];tableFingerprints:AuditSnapshot['fingerprints'];postsWithoutSeo:AuditSnapshot['postsWithoutSeo'];catalog:AuditSnapshot['catalog']};snapshot:AuditSnapshot;pending:LegacySeoRepair[];
}
function buildPlan(snapshot:AuditSnapshot,material:AuditMaterial):AuditPlan {
  const migrationPending=ledgerPending(snapshot,material),repairState=currentRepairs(snapshot,material);
  const auditTrigger=snapshot.catalog.triggers.find(trigger=>trigger.schema==='public'&&trigger.name==='posts'&&trigger.trigger==='audit_post_change');
  ensure(auditTrigger?.enabled==='O','audit_trigger_not_enabled');
  const summary:AuditPlan['summary']={mode:'plan',readOnly:true,projectRef:CLINIC_REF,migrationSha256:material.sha256,initialMigrationSha256:material.initialSha256,migrationPending,
    pendingSeo:repairState.pending.length,alreadyRepairedSeo:repairState.alreadyRepaired.length,skippedEditedWpIds:repairState.skippedEditedWpIds,tableFingerprints:snapshot.fingerprints,postsWithoutSeo:snapshot.postsWithoutSeo,catalog:snapshot.catalog};
  const hash=digest({summary,ledger:snapshot.ledger.map(row=>({version:row.version,name:row.name,sqlHashes:row.statements.map(sqlDigest)})),repairs:material.repairs});
  return {hash,summary,snapshot,pending:repairState.pending};
}
export async function planAuditCorrections(client:SqlConnection,material:AuditMaterial):Promise<AuditPlan> {
  await client.query('begin isolation level repeatable read read only');
  try {const plan=buildPlan(await collectAuditSnapshot(client),material);await client.query('rollback');return plan;}
  catch(error){await client.query('rollback');throw error;}
}

function foundation(snapshot:AuditSnapshot){
  return {tables:snapshot.catalog.tables,policies:snapshot.catalog.policies,triggers:snapshot.catalog.triggers,schemas:snapshot.catalog.schemas,buckets:snapshot.catalog.buckets,providerAcl:snapshot.catalog.providerAclSha256,
    functions:snapshot.catalog.functions.map(({anon_execute:_,authenticated_execute:__,service_role_execute:___,...rest})=>rest)};
}
export function assertLeastPrivileges(snapshot:AuditSnapshot):void {
  ensure(snapshot.catalog.tablePrivileges.every(row=>!['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'].includes(row.privilege)||!row.allowed),'dangerous_table_privilege_remaining');
  const anonymousReads=new Set(['posts','redirects','taxonomies','settings','reserved_routes']);
  for(const row of snapshot.catalog.tablePrivileges){
    const expected=row.role==='anon'?row.schema==='public'&&anonymousReads.has(row.name)&&row.privilege==='SELECT':row.role==='authenticated'?row.schema==='public'&&row.privilege==='SELECT'||row.schema==='public'&&['media','media_uploads'].includes(row.name)&&row.privilege==='DELETE':false;
    ensure(row.allowed===expected,'table_privilege_contract_mismatch');
  }
  const writable:Record<string,{INSERT?:string[];UPDATE?:string[]}>={
    posts:{INSERT:['slug','legacy_path','public_path','title','excerpt_html','body_html','author_name','featured_image','featured_alt','category_ids','tag_ids','seo','published_at','updated_by'],UPDATE:['slug','public_path','title','excerpt_html','body_html','author_name','status','featured_image','featured_alt','category_ids','tag_ids','seo','published_at','version','publication_sync']},
    redirects:{INSERT:['from_path','to_path','post_id'],UPDATE:['to_path']},media:{INSERT:['id','url','storage_path','mime_type','bytes','width','height','alt','caption'],UPDATE:['alt','caption']},
    media_uploads:{INSERT:['id','user_id','storage_path','mime_type','bytes','alt','caption']},settings:{UPDATE:['value','version','updated_at','updated_by']},
  };
  for(const row of snapshot.catalog.columnPrivileges){
    const expected=row.privilege==='SELECT'?row.role==='anon'?row.schema==='public'&&anonymousReads.has(row.name):row.role==='authenticated'&&row.schema==='public':row.role==='authenticated'&&row.schema==='public'&&Boolean(writable[row.name]?.[row.privilege as 'INSERT'|'UPDATE']?.includes(row.column));
    ensure(row.allowed===expected,'column_privilege_contract_mismatch');
  }
  for(const row of snapshot.catalog.functions){
    const publicAdmin=['create_post','save_post','restore_post','save_settings','restore_contact_settings'];
    const privateAdmin=['is_active_admin','media_url_path','is_deletable_media_path'];
    const shared=row.schema==='public'&&row.name==='get_public_media'||row.schema==='private'&&['is_public_media_path','public_media'].includes(row.name);
    ensure(row.anon_execute===shared,'anonymous_rpc_privilege_mismatch');
    ensure(row.authenticated_execute===(shared||row.schema==='public'&&publicAdmin.includes(row.name)||row.schema==='private'&&privateAdmin.includes(row.name)),'authenticated_rpc_privilege_mismatch');
    ensure(row.service_role_execute===(row.schema==='public'&&row.name==='consume_login_attempt'||row.schema==='private'&&row.name==='consume_login_bucket'),'server_rpc_privilege_mismatch');
  }
  ensure(snapshot.catalog.defaults.every(row=>row.owner!=='postgres'||!['anon','authenticated','service_role'].includes(row.grantee)||!['','public','private'].includes(row.schema)),'client_default_privilege_remaining');
  ensure(snapshot.catalog.defaults.every(row=>!(row.owner==='postgres'&&row.schema===''&&row.type==='f'&&row.grantee==='PUBLIC'&&row.privilege_type==='EXECUTE')),'global_public_function_default_remaining');
}
export async function executeAuditCorrections(client:SqlConnection,material:AuditMaterial,approvedHash:string,writeBackup:(contents:unknown)=>Promise<string>){
  ensure(/^[a-f0-9]{64}$/.test(approvedHash),'approval_hash_required');
  await client.query('begin');
  try {
    await client.query("set local lock_timeout='5s'");await client.query("set local statement_timeout='30s'");
    await client.query("select pg_advisory_xact_lock(hashtext('benchimol-audit-corrections-20261002'))");
    await client.query(`lock table ${TABLES.join(',')},supabase_migrations.schema_migrations in share row exclusive mode`);
    await client.query('lock table public.posts in access exclusive mode');
    const before=await collectAuditSnapshot(client),plan=buildPlan(before,material);ensure(plan.hash===approvedHash,'approval_plan_changed');
    let hardeningRequired=plan.summary.migrationPending;
    if(!hardeningRequired){try{assertLeastPrivileges(before);}catch{hardeningRequired=true;}}
    const changed=hardeningRequired||plan.pending.length>0;
    const backupPath=changed?await writeBackup({schemaVersion:1,createdAt:new Date().toISOString(),projectRef:CLINIC_REF,approvedPlanHash:approvedHash,contents:before.contents,ledger:before.ledger,catalog:before.catalog}):null;
    if(hardeningRequired)await client.query(material.sql);
    if(plan.summary.migrationPending)await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[VERSION,NAME,[material.sql]]);
    if(plan.pending.length){
      await client.query('alter table public.posts disable trigger audit_post_change');
      const payload=plan.pending.map(repair=>({id:repair.id,wp_id:repair.wpId,source_hash:repair.sourceHash,version:repair.version,before:repair.before,after:repair.after}));
      const updated=await client.query(`with repairs as (select * from jsonb_to_recordset($1::jsonb) as r(id uuid,wp_id bigint,source_hash text,version integer,before jsonb,after jsonb))
        update public.posts p set seo=r.after from repairs r where p.id=r.id and p.wp_id=r.wp_id and p.source_hash=r.source_hash and p.version=r.version and p.seo=r.before returning p.wp_id::integer as wp_id`,[JSON.stringify(payload)]);
      ensure(updated.rows.length===plan.pending.length,'legacy_seo_update_count_mismatch');
      await client.query('alter table public.posts enable trigger audit_post_change');
    }
    const after=await collectAuditSnapshot(client);assertLeastPrivileges(after);ensure(!ledgerPending(after,material),'migration_not_recorded');
    ensure(digest(foundation(after))===digest(foundation(before)),'schema_or_provider_foundation_changed');
    ensure(digest(after.postsWithoutSeo)===digest(before.postsWithoutSeo),'post_content_date_version_changed');
    for(const table of TABLES)if(table!=='public.posts')ensure(digest(after.fingerprints[table])===digest(before.fingerprints[table]),'other_application_content_changed');
    const expectedRows=before.contents['public.posts'].map(row=>{const repair=plan.pending.find(item=>item.id===row.id);return repair?{...row,seo:repair.after}:row;});
    ensure(digest(expectedRows.map(canonical).sort())===after.fingerprints['public.posts'].sha256,'unexpected_post_seo_changed');
    const final=buildPlan(after,material);ensure(final.pending.length===0,'legacy_seo_reconciliation_failed');
    if(hardeningRequired)await client.query("notify pgrst,'reload schema'");
    await client.query('commit');
    return {committed:true,changed,repairedSeo:plan.pending.length,migrationApplied:plan.summary.migrationPending,hardeningApplied:hardeningRequired,contentsPreserved:true,
      projectRef:CLINIC_REF,approvedPlanHash:approvedHash,migrationSha256:material.sha256,skippedEditedWpIds:plan.summary.skippedEditedWpIds,backupPath,
      before:{fingerprints:before.fingerprints,postsWithoutSeo:before.postsWithoutSeo,catalog:before.catalog},after:{fingerprints:after.fingerprints,postsWithoutSeo:after.postsWithoutSeo,catalog:after.catalog}};
  }catch(error){await client.query('rollback');throw error;}
}

async function clinicConnection(expectedRef:string|undefined){
  ensure(expectedRef===CLINIC_REF,'explicit_clinic_ref_required');
  const file=resolve('.env.local'),metadata=await lstat(file);ensure(metadata.isFile()&&!metadata.isSymbolicLink()&&(metadata.mode&0o077)===0,'private_env_permissions_required');
  const env=parseEnv(await readFile(file,'utf8'));
  for(const key of ['SUPABASE_CLINIC_PROJECT_REF','DATABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_DB_CA_FILE','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']){
    if(process.env[key]!==undefined&&env[key]!==undefined)ensure(process.env[key]===env[key],'ambient_environment_mismatch');
    if(env[key]!==undefined)process.env[key]=env[key];
  }
  ensure(env.SUPABASE_CLINIC_PROJECT_REF===CLINIC_REF,'private_env_clinic_binding_mismatch');
  const target=env.DATABASE_URL,api=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  ensure(target&&api&&key,'private_env_missing_configuration');assertClinicTarget(target,true);assertClinicTarget(api,true);
  const url=new URL(api),database=new URL(target);
  ensure(url.protocol==='https:'&&url.hostname===`${CLINIC_REF}.supabase.co`&&!url.username&&!url.password&&!url.port&&url.pathname==='/'&&!url.search&&!url.hash,'clinic_api_target_mismatch');
  ensure(!['localhost','127.0.0.1','::1','[::1]'].includes(database.hostname),'loopback_forbidden');
  const connection=await pgConnectionConfig(target);
  const response=await fetch(`${url.origin}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
  ensure(response.ok,'clinic_api_unavailable');const auth=await response.json();ensure(auth.disable_signup===true,'public_signup_must_remain_disabled');
  const client=new Client({...connection,application_name:'benchimol-audit-corrections',connectionTimeoutMillis:15000,query_timeout:30000});await client.connect();
  try {
    const stream=(client as any).connection.stream;ensure(stream.encrypted===true&&stream.authorized===true,'verified_database_tls_required');
    const identity=(await client.query("select current_database() as database,current_user as role,(select ssl from pg_stat_ssl where pid=pg_backend_pid()) as tls")).rows[0];
    ensure(identity.database==='postgres'&&identity.role==='postgres','clinic_database_identity_mismatch');
    // pg_stat_ssl can describe the pooler's backend hop, not the verified client socket.
    return {client,transport:{apiBound:true,databaseBound:true,clientTlsVerified:true,backendTlsObserved:identity.tls===true,databaseIdentityVerified:true,signupDisabled:true}};
  }catch(error){await client.end();throw error;}
}
async function privateBackup(contents:unknown):Promise<string>{
  let parent=resolve('.');
  for(const part of ['backups','audit-corrections']){
    parent=join(parent,part);await mkdir(parent,{mode:0o700}).catch(error=>{if(error.code!=='EEXIST')throw error;});
    const info=await lstat(parent);ensure(info.isDirectory()&&!info.isSymbolicLink()&&(part==='backups'||(info.mode&0o077)===0),'private_backup_directory_required');
  }
  const folder=join(parent,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}`);await mkdir(folder,{mode:0o700});
  const path=join(folder,'application-tables-and-privileges.json');await writeFile(path,JSON.stringify(contents,null,2)+'\n',{flag:'wx',mode:0o600});return path;
}
let committed=false;
async function main(){
  const args=process.argv.slice(2),expected=args.find(arg=>arg.startsWith('--expected-ref='))?.slice('--expected-ref='.length),confirm=args.find(arg=>arg.startsWith('--confirm-plan='))?.slice('--confirm-plan='.length);
  ensure(args.every(arg=>arg==='--execute'||arg.startsWith('--expected-ref=')||arg.startsWith('--confirm-plan=')),'unknown_executor_argument');
  const material=await readAuditMaterial(),{client,transport}=await clinicConnection(expected);
  try {
    let report:unknown;
    if(args.includes('--execute')){ensure(confirm,'approval_hash_required');const result=await executeAuditCorrections(client,material,confirm,privateBackup);committed=result.committed;report={mode:'execute',createdAt:new Date().toISOString(),transport,...result};}
    else {const plan=await planAuditCorrections(client,material);report={createdAt:new Date().toISOString(),transport,...plan.summary,planHash:plan.hash};}
    const dir=resolve('docs/validation/corrections-2026-10-02');await mkdir(dir,{recursive:true});
    const output=join(dir,`clinic-${args.includes('--execute')?'execution':'plan'}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    const r=report as Row;console.log(JSON.stringify({completed:true,mode:r.mode,projectRef:CLINIC_REF,planHash:r.planHash??r.approvedPlanHash,committed:r.committed??false,changed:r.changed??false,pendingSeo:r.pendingSeo??null,repairedSeo:r.repairedSeo??null,report:output},null,2));
  }finally{await client.end();}
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(error=>{const code=error instanceof Error&&/^[a-z0-9_]+$/.test(error.message)?error.message:/^[a-zA-Z0-9_]+$/.test(error.code??'')?error.code:'audit_corrections_failed';console.error(JSON.stringify({completed:false,committed,errorCode:code}));process.exitCode=1;});
