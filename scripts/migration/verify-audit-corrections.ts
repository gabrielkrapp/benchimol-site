/** Hosted ACL/SEO verification. SQL fixtures are opt-in and always rolled back. */
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { buildImportPlan } from './import-database';
import { CLINIC_REF, collectAuditSnapshot, assertLeastPrivileges, digest } from './apply-audit-corrections';

function ensure(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
type Check = { name: string; passed: true };

export async function verifyTransactionalPolicies(client: Client) {
  const checks: Check[] = [], check = (name: string) => checks.push({ name, passed: true });
  await client.query('begin');
  try {
    await client.query("set local lock_timeout='5s'; set local statement_timeout='30s'");
    // Freeze editorial state and limiter only for this short manual verification.
    await client.query('lock table public.administrators,public.posts,public.post_revisions,public.media,public.media_uploads,public.settings,public.settings_revisions,public.redirects,public.taxonomies,public.reserved_routes,public.operation_events,private.login_windows in share row exclusive mode');
    const before = await collectAuditSnapshot(client); assertLeastPrivileges(before);
    const admin = (await client.query('select user_id from public.administrators where active=true order by user_id limit 1')).rows[0]?.user_id;
    ensure(admin, 'active_admin_required');
    await client.query('savepoint fixtures');
    const as = async (role: 'postgres'|'anon'|'authenticated'|'service_role', uid: string) => {
      await client.query(`set local role ${role}`); await client.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    };
    const denied = async (role: 'anon'|'authenticated', uid: string, sql: string, values: unknown[] = []) => {
      await client.query('savepoint denial'); let refused = false;
      try { await as(role, uid); await client.query(sql, values); }
      catch (error) { ensure((error as { code?: string }).code === '42501', 'unexpected_permission_failure'); refused = true; }
      finally { await client.query('rollback to savepoint denial'); await client.query('release savepoint denial'); }
      ensure(refused, 'unauthorized_operation_allowed');
    };
    const payload = { title: 'QA transacional privada', slug: `qa-audit-${randomUUID()}`, bodyHtml: '<p>Fixture transacional privada.</p>' };
    for (const [role, uid] of [['anon',''], ['authenticated',randomUUID()]] as const) {
      await denied(role, uid, 'select public.create_post($1::jsonb)', [JSON.stringify(payload)]);
      check(`${role}: unauthorized create RPC refused with 42501`);
    }
    await denied('anon', '', 'select * from public.media');
    await denied('authenticated', admin, 'select * from private.login_windows');
    check('Private catalog and limiter table remain inaccessible to clients');
    await as('authenticated', admin);
    const created = (await client.query('select to_jsonb(public.create_post($1::jsonb)) as post', [JSON.stringify(payload)])).rows[0].post;
    ensure(created.status === 'draft', 'fixture_must_remain_draft');
    for (const [version, patch] of [[1,{status:'draft',title:'QA privada editada'}],[2,{status:'trashed'}]] as const) {
      await client.query('select public.save_post($1,$2,$3::jsonb)', [created.id, version, JSON.stringify(patch)]);
    }
    const restored = (await client.query('select to_jsonb(public.restore_post($1,3,null)) as post', [created.id])).rows[0].post;
    ensure(restored.status === 'draft' && restored.version === 4, 'draft_edit_trash_restore_failed');
    check('Active admin: draft create/edit/trash/restore succeeded without publication');
    await as('anon', '');
    ensure((await client.query('select id from public.posts where id=$1', [created.id])).rowCount === 0, 'draft_leaked');
    await as('authenticated', admin);
    const settings = (await client.query('select key,value,version from public.settings order by key')).rows;
    ensure(settings.length === 2, 'settings_missing');
    for (const setting of settings) {
      const saved = (await client.query('select to_jsonb(public.save_settings($1,$2,$3::jsonb)) as setting', [setting.key, setting.version, JSON.stringify(setting.value)])).rows[0].setting;
      ensure(saved.version === setting.version + 1 && digest(saved.value) === digest(setting.value), 'settings_probe_failed');
    }
    check('Popup and contact same-value versioned saves passed inside rollback');
    const mediaId = randomUUID(), path = `${admin}/${mediaId}.png`;
    await client.query('insert into public.media(id,url,storage_path,mime_type,bytes,width,height,alt,caption) values($1,$2,$3,$4,20,2,2,$5,$6)', [mediaId,`/api/media/${mediaId}`,path,'image/png','QA','QA']);
    ensure((await client.query('update public.media set alt=$1,caption=$2 where id=$3', ['QA editado','QA editado',mediaId])).rowCount === 1, 'media_update_failed');
    await as('anon', ''); ensure((await client.query('select id from public.get_public_media($1)', [mediaId])).rowCount === 0, 'private_media_leaked');
    await as('authenticated', admin);
    ensure((await client.query('delete from public.media where id=$1', [mediaId])).rowCount === 1, 'media_delete_failed');
    await client.query('insert into public.media_uploads(id,user_id,storage_path,mime_type,bytes,alt,caption) values($1,$2,$3,$4,20,$5,$6)', [mediaId,admin,path,'image/png','QA','QA']);
    ensure((await client.query('delete from public.media_uploads where id=$1', [mediaId])).rowCount === 1, 'intent_delete_failed');
    check('Media metadata insert/edit/delete and own upload-intent CRUD passed; no Storage bytes created');
    await as('service_role', '');
    const hash = createHash('sha256').update(`transaction-only-${randomUUID()}`).digest('hex');
    ensure((await client.query('select public.consume_login_attempt($1,8) as allowed', [hash])).rows[0].allowed === true, 'service_limiter_rpc_failed');
    check('Service-only limiter RPC passed with a synthetic hash inside rollback');
    await as('postgres', ''); await client.query('rollback to savepoint fixtures');
    const after = await collectAuditSnapshot(client); assertLeastPrivileges(after);
    ensure(digest(before.fingerprints) === digest(after.fingerprints), 'transactional_content_not_restored');
    check('All 12 application relations preserved by exact counts and hashes after fixture rollback');
    return { checks, fingerprints: after.fingerprints, fixtureWritesRolledBack: true, storageBytesCreated: 0, actualLogins: 0, accountsCreated: 0 };
  } finally { await client.query('rollback'); }
}

async function main() {
  const args = process.argv.slice(2), probes = args.includes('--transactional-probes');
  ensure(args.every(arg => arg === '--transactional-probes' || arg === `--expected-ref=${CLINIC_REF}`) && args.includes(`--expected-ref=${CLINIC_REF}`), 'explicit_clinic_ref_required');
  const envPath = resolve('.env.local'), info = await lstat(envPath);
  ensure(info.isFile() && !info.isSymbolicLink() && (info.mode & 0o077) === 0, 'private_env_permissions_required');
  const env = parseEnv(await readFile(envPath,'utf8'));
  for (const name of ['SUPABASE_CLINIC_PROJECT_REF','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','DATABASE_URL','SUPABASE_DB_CA_FILE']) {
    if (process.env[name] !== undefined && env[name] !== undefined) ensure(process.env[name] === env[name], 'ambient_environment_mismatch');
    if (env[name] !== undefined) process.env[name] = env[name];
  }
  ensure(env.SUPABASE_CLINIC_PROJECT_REF === CLINIC_REF, 'clinic_binding');
  const api = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, target = env.DATABASE_URL;
  ensure(api && key && target, 'missing_clinic_configuration'); assertClinicTarget(api,true); assertClinicTarget(target,true);
  const url = new URL(api), dbUrl = new URL(target);
  ensure(url.protocol === 'https:' && url.hostname === `${CLINIC_REF}.supabase.co` && !url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'clinic_api_target_mismatch');
  ensure(!['localhost','127.0.0.1','::1','[::1]'].includes(dbUrl.hostname), 'loopback_forbidden');
  const checks: Check[] = [], sdk = createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(15000)})}});
  const posts = await sdk.from('posts').select('wp_id,body_html,slug,public_path,status,published_at,seo',{count:'exact'}).order('wp_id').range(0,999);
  const expected = new Map(buildImportPlan().posts.filter(post => post.public_path).map(post => [post.wp_id,post]));
  ensure(!posts.error && posts.count === 153 && posts.data?.length === 153 && expected.size === 153, 'public_inventory_mismatch');
  ensure(posts.data.every(post => {const source=expected.get(Number(post.wp_id));return source && post.body_html===source.body_html && post.slug===source.slug && post.public_path===source.public_path && post.status==='published' && new Date(post.published_at).toISOString()===new Date(source.published_at!).toISOString() && digest(post.seo)===digest(source.seo);}), 'public_content_or_repaired_seo_mismatch');
  checks.push({name:'Anonymous API: 153 canonical bodies, paths, dates and corrected legacy SEO exact',passed:true});
  const catalog = await sdk.from('media').select('id').limit(1); ensure(catalog.error?.code === '42501', 'anonymous_catalog_not_denied');
  const authResponse = await fetch(`${url.origin}/auth/v1/settings`,{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(15000)});
  ensure(authResponse.ok && (await authResponse.json()).disable_signup === true, 'signup_disabled_required');
  checks.push({name:'Anonymous media catalog refused with 42501; public signup disabled',passed:true});
  const client = new Client({...await pgConnectionConfig(target),application_name:'benchimol-audit-corrections-verification',connectionTimeoutMillis:15000,query_timeout:30000});
  await client.connect();
  try {
    const stream = (client as any).connection.stream, identity = (await client.query('select current_database() as database,current_user as role,(select ssl from pg_stat_ssl where pid=pg_backend_pid()) as tls')).rows[0];
    ensure(stream.encrypted===true && stream.authorized===true && identity.database==='postgres' && identity.role==='postgres' && identity.tls===true, 'verified_database_identity_required');
    const bucket = (await client.query("select public,file_size_limit from storage.buckets where id='editorial-media'")).rows[0];
    ensure(bucket?.public === false && Number(bucket.file_size_limit) === 10485760, 'private_bucket_required');
    checks.push({name:'Clinic PostgreSQL identity and TLS verified; managed image bucket private',passed:true});
    let sqlEvidence: unknown;
    if (probes) sqlEvidence = await verifyTransactionalPolicies(client);
    else { await client.query('begin read only'); try { const snapshot=await collectAuditSnapshot(client); assertLeastPrivileges(snapshot); sqlEvidence={transactionalProbesRun:false,fingerprints:snapshot.fingerprints}; } finally {await client.query('rollback');} }
    const report = {createdAt:new Date().toISOString(),projectRef:CLINIC_REF,passed:true,transactionalProbesRun:probes,checks,sqlEvidence,noDocker:true,noDeployment:true};
    const folder = resolve('docs/validation/corrections-2026-10-02'); await mkdir(folder,{recursive:true});
    const output = resolve(folder,`clinic-verification-${new Date().toISOString().replace(/[:.]/g,'-')}.json`); await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({passed:true,projectRef:CLINIC_REF,transactionalProbesRun:probes,checks:checks.length,report:output}));
  } finally { await client.end(); }
}
if (resolve(process.argv[1]??'') === fileURLToPath(import.meta.url)) main().catch(error => {
  const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : /^[a-zA-Z0-9_]+$/.test(error.code??'') ? error.code : 'clinic_verification_failed';
  console.error(JSON.stringify({passed:false,errorCode:code})); process.exitCode=1;
});
