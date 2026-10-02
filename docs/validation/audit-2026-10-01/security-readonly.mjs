/** One audit capture: SELECT catalog/config only, clinic binding + verified TLS. */
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { assertClinicTarget } from '../../../src/lib/server/clinic-binding.ts';
import { pgConnectionConfig } from '../../../src/lib/server/database-connection.ts';

const expectedRef='jjrzmuuwuvxcsnwqzvxf';
const report={capturedAt:new Date().toISOString(),projectRef:expectedRef,readOnly:true,context7Available:false};
async function main(){
 if(process.env.SUPABASE_CLINIC_PROJECT_REF!==expectedRef)throw new Error('clinic_binding');
 const api=process.env.NEXT_PUBLIC_SUPABASE_URL,target=process.env.DATABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!api||!target||!key)throw new Error('required_environment');
 assertClinicTarget(api,true);assertClinicTarget(target,true);
 const connection=await pgConnectionConfig(target);
 const client=new Client({...connection,application_name:'benchimol-security-readonly-audit',connectionTimeoutMillis:15000,query_timeout:15000});
 await client.connect();
 try{
  await client.query('begin read only');
  report.transactionReadOnly=(await client.query("select current_setting('transaction_read_only') as value")).rows[0].value==='on';
  const catalog=async(sql)=>(await client.query(sql)).rows;
  report.tables=await catalog(`select n.nspname as schema,c.relname as table,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,pg_get_userbyid(c.relowner) as owner,
    has_table_privilege('anon',c.oid,'SELECT') as anon_select,has_table_privilege('anon',c.oid,'INSERT') as anon_insert,has_table_privilege('anon',c.oid,'UPDATE') as anon_update,has_table_privilege('anon',c.oid,'DELETE') as anon_delete,
    has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,has_table_privilege('authenticated',c.oid,'DELETE') as authenticated_delete
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private','auth','storage') and c.relkind in('r','p') order by n.nspname,c.relname`);
  report.policies=await catalog(`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in('public','private','storage') order by schemaname,tablename,policyname`);
  report.schemaPrivileges=await catalog(`select nspname as schema,has_schema_privilege('anon',oid,'USAGE') as anon_usage,has_schema_privilege('authenticated',oid,'USAGE') as authenticated_usage,has_schema_privilege('anon',oid,'CREATE') as anon_create,has_schema_privilege('authenticated',oid,'CREATE') as authenticated_create from pg_namespace where nspname in('public','private','auth','storage') order by nspname`);
  report.columns=await catalog(`select n.nspname as schema,c.relname as table,a.attname as column,has_column_privilege('anon',c.oid,a.attnum,'SELECT') as anon_select,has_column_privilege('anon',c.oid,a.attnum,'INSERT') as anon_insert,has_column_privilege('anon',c.oid,a.attnum,'UPDATE') as anon_update,has_column_privilege('authenticated',c.oid,a.attnum,'INSERT') as authenticated_insert,has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE') as authenticated_update from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid where n.nspname in('public','private') and c.relkind='r' and a.attnum>0 and not a.attisdropped order by n.nspname,c.relname,a.attnum`);
  const functions=await catalog(`select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef as security_definer,p.proconfig as config,pg_get_userbyid(p.proowner) as owner,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' order by n.nspname,p.proname,p.oid`);
  report.functions=functions.map(({definition,...metadata})=>({...metadata,definitionSha256:createHash('sha256').update(definition).digest('hex'),referencesAuthUid:/auth\.uid\s*\(/i.test(definition),referencesActiveAdmin:/is_active_admin|administrators[\s\S]*active/i.test(definition)}));
  report.views=await catalog(`select n.nspname as schema,c.relname as name,c.reloptions as options,has_table_privilege('anon',c.oid,'SELECT') as anon_select,has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind in('v','m') order by n.nspname,c.relname`);
  report.triggers=await catalog(`select n.nspname as schema,c.relname as table,t.tgname as trigger,t.tgenabled as enabled,p.proname as function from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname in('public','private') and not t.tgisinternal order by n.nspname,c.relname,t.tgname`);
  report.buckets=await catalog(`select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id`);
  report.roles=await catalog(`select rolname as name,rolsuper as superuser,rolbypassrls as bypass_rls from pg_roles where rolname in('anon','authenticated','service_role','postgres') order by rolname`);
  report.apiSchemaConfiguration=await catalog(`select coalesce(r.rolname,'all') as role,s as setting from pg_db_role_setting d left join pg_roles r on r.oid=d.setrole cross join lateral unnest(d.setconfig) s where s like 'pgrst.db_schemas=%' order by role,setting`);
  await client.query('rollback');
 }finally{await client.end();}
 const authResponse=await fetch(`${api}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 if(!authResponse.ok)throw new Error('auth_settings_unavailable');
 const auth=await authResponse.json();
 report.auth={settingsHttpStatus:authResponse.status,disableSignup:auth.disable_signup===true,emailEnabled:auth.external?.email===true,anonymousEnabled:auth.external?.anonymous_users===true,mailerAutoconfirm:auth.mailer_autoconfirm===true};
 await writeFile(new URL('./security-catalog.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 const applicationTables=report.tables.filter(t=>['public','private'].includes(t.schema));
 console.log(JSON.stringify({completed:true,readOnly:report.transactionReadOnly,projectRef:expectedRef,applicationTables:applicationTables.length,applicationTablesWithRls:applicationTables.filter(t=>t.rls).length,views:report.views.length,functions:report.functions.length,disableSignup:report.auth.disableSignup,buckets:report.buckets},null,2));
}
main().catch(error=>{console.error(JSON.stringify({completed:false,errorCode:/^[a-z0-9_]+$/.test(error.code??'')?error.code:'audit_capture_failed'}));process.exitCode=1;});
