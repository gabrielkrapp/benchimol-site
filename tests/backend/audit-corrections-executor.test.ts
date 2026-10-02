import { afterEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, writeFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildImportPlan, buildLegacySeoRepairPlan } from '../../scripts/migration/import-database';

const executor = await import('../../scripts/migration/apply-audit-corrections').catch(() => null);
let db: PGlite | undefined, folder: string | undefined;
// Match pg's simple protocol for unparameterized migration batches; SQL remains real.
const connection = () => ({ query: async(sql: string, values?: any[]) => values === undefined ? (await db!.exec(sql)).at(-1)! : db!.query(sql,values) });
afterEach(async () => { await db?.close(); db = undefined; if (folder) await rm(folder, { recursive: true, force: true }); folder = undefined; });

async function fixture() {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create function storage.allow_any_operation(operations text[]) returns boolean language sql stable as $$select coalesce(current_setting('storage.operation',true),'')=any(operations)$$;
    alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges for role postgres in schema public grant all on functions to anon,authenticated,service_role;`);
  const initial = await readFile('supabase/migrations/20261001202736_benchimol_editorial_initial.sql', 'utf8');
  await db.exec(initial);
  await db.exec('create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);');
  await db.query('insert into supabase_migrations.schema_migrations values($1,$2,$3)', ['20261001202736', 'benchimol_editorial_initial', [initial]]);
  const repairs = buildLegacySeoRepairPlan().filter(repair => [17,18].includes(repair.wpId));
  for (const repair of repairs) {
    const row = buildImportPlan().posts.find(post => post.wp_id === repair.wpId)!;
    await db.query('insert into public.posts(id,wp_id,slug,legacy_path,public_path,title,body_html,author_name,status,published_at,created_at,updated_at,version,seo,source_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [row.id,row.wp_id,row.slug,row.legacy_path,row.public_path,row.title,row.body_html,row.author_name,row.status,row.published_at,row.created_at,row.updated_at,row.version,JSON.stringify(repair.before),row.source_hash]);
  }
  const material = await executor?.readAuditMaterial();
  expect(material).toBeDefined();
  folder = await mkdtemp(join(tmpdir(), 'benchimol-audit-executor-'));
  const backup = async (contents: unknown) => {
    const path = join(folder!, 'snapshot.json'); await writeFile(path, JSON.stringify(contents), { flag:'wx', mode:0o600 });
    expect((await stat(path)).mode & 0o777).toBe(0o600); return path;
  };
  return { material: { ...material!, repairs }, backup };
}

describe('audit correction executor with actual PostgreSQL', () => {
  it('plans read-only, then repairs exact legacy SEO and grants without changing content/date/version or trigger state', async () => {
    const { material, backup } = await fixture();
    const plan = await executor?.planAuditCorrections(connection(), material);
    expect(plan?.summary).toMatchObject({ mode:'plan', readOnly:true, pendingSeo:2, migrationPending:true });
    const before = await executor!.collectAuditSnapshot(connection());
    expect((await db!.query("select has_table_privilege('anon','public.posts','TRUNCATE') as allowed")).rows).toEqual([{allowed:true}]);
    const result = await executor!.executeAuditCorrections(connection(), material, plan!.hash, backup);
    expect(result).toMatchObject({ committed:true, changed:true, repairedSeo:2, migrationApplied:true, contentsPreserved:true });
    const after = await executor!.collectAuditSnapshot(connection());
    expect(after.postsWithoutSeo).toEqual(before.postsWithoutSeo);
    for (const [table, fingerprint] of Object.entries(before.fingerprints)) if (table !== 'public.posts') expect(after.fingerprints[table]).toEqual(fingerprint);
    expect((await db!.query("select tgenabled from pg_trigger where tgrelid='public.posts'::regclass and tgname='audit_post_change'")).rows).toEqual([{tgenabled:'O'}]);
    const rows = (await db!.query('select wp_id::integer as wp_id,seo,version from public.posts order by wp_id')).rows as any[];
    expect(rows.map(row => row.wp_id)).toEqual([17,18]);
    for (const row of rows) { expect(row.version).toBe(1); expect(row.seo.description).toContain('…'); expect(row.seo.description).not.toContain('&hellip;'); }
    expect((await db!.query("select has_table_privilege('anon','public.posts','TRUNCATE') as truncate,has_table_privilege('authenticated','public.posts','TRIGGER') as trigger,has_table_privilege('anon','public.posts','REFERENCES') as references,has_table_privilege('anon','public.posts','MAINTAIN') as maintain")).rows).toEqual([{truncate:false,trigger:false,references:false,maintain:false}]);
    const repeat = await executor!.planAuditCorrections(connection(), material);
    const unchanged = await executor!.executeAuditCorrections(connection(), material, repeat.hash, backup);
    expect(unchanged).toMatchObject({ changed:false, repairedSeo:0, migrationApplied:false, contentsPreserved:true });
    expect((await db!.query('select version from supabase_migrations.schema_migrations order by version')).rows).toEqual([{version:'20261001202736'},{version:'20261002032930'}]);
  },40000);

  it('refuses a stale approved hash before changing grants, metadata, ledger or trigger', async () => {
    const { material, backup } = await fixture(), plan = await executor!.planAuditCorrections(connection(), material);
    await db!.query("update public.settings set value=value||'{\"message\":\"Atualizado pelo cliente\"}'::jsonb,version=version+1 where key='contact'");
    const before = await executor!.collectAuditSnapshot(connection());
    await expect(executor!.executeAuditCorrections(connection(), material, plan.hash, backup)).rejects.toThrow('approval_plan_changed');
    const after = await executor!.collectAuditSnapshot(connection());
    expect(after).toEqual(before);
  },40000);

  it('rolls back a failure after the audit trigger was suspended, including grants and migration ledger', async () => {
    const { material, backup } = await fixture();
    await db!.exec("alter table public.posts add constraint reject_decoded_fixture check(seo->>'description' not like '%…%')");
    const plan = await executor!.planAuditCorrections(connection(), material), before = await executor!.collectAuditSnapshot(connection());
    await expect(executor!.executeAuditCorrections(connection(), material, plan.hash, backup)).rejects.toThrow(/reject_decoded_fixture/);
    expect(await executor!.collectAuditSnapshot(connection())).toEqual(before);
    expect((await db!.query("select tgenabled from pg_trigger where tgrelid='public.posts'::regclass and tgname='audit_post_change'")).rows).toEqual([{tgenabled:'O'}]);
  },40000);

  it('preserves and documents already edited version-two posts, but rejects differing version-one SEO', async () => {
    const { material, backup } = await fixture();
    await db!.query("update public.posts set version=2,title='Edição real do cliente',seo=seo||'{\"description\":\"Texto novo &hellip; literal\"}'::jsonb where wp_id=18");
    const plan = await executor!.planAuditCorrections(connection(), material);
    expect(plan.summary).toMatchObject({pendingSeo:1,skippedEditedWpIds:[18]});
    const editedBefore = (await db!.query('select to_jsonb(p) as row from public.posts p where wp_id=18')).rows;
    await executor!.executeAuditCorrections(connection(), material, plan.hash, backup);
    expect((await db!.query('select to_jsonb(p) as row from public.posts p where wp_id=18')).rows).toEqual(editedBefore);
    await db!.exec('alter table public.posts disable trigger audit_post_change');
    await db!.query("update public.posts set seo=seo||'{\"description\":\"Versão um divergente\"}'::jsonb where wp_id=17");
    await db!.exec('alter table public.posts enable trigger audit_post_change');
    await expect(executor!.planAuditCorrections(connection(), material)).rejects.toThrow('legacy_seo_conflict');
  },40000);

  it('rejects an initial migration history whose SQL differs from the checked local source', async () => {
    const { material } = await fixture();
    await db!.query('update supabase_migrations.schema_migrations set statements=$1 where version=$2', [['different SQL'],'20261001202736']);
    await expect(executor!.planAuditCorrections(connection(), material)).rejects.toThrow('initial_migration_mismatch');
  },40000);
});
