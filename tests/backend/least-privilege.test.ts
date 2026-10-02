import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const ADMIN = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
async function as(role: string, uid: string, sql: string) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false);`);
  try { return await db.query(sql); } finally { await db.exec('reset role;'); }
}
const hardening = 'supabase/schemas/05_least_privilege.sql';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${ADMIN}'),('${OTHER}');
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated; grant insert,delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create function storage.allow_any_operation(operations text[]) returns boolean language sql stable as $$select coalesce(current_setting('storage.operation',true),'')=any(operations)$$;
    grant execute on function storage.foldername(text),storage.allow_any_operation(text[]) to authenticated;
    alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges for role postgres in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of ['01_editorial', '02_mutations', '03_storage', '04_login_limit']) await db.exec(await readFile(`supabase/schemas/${file}.sql`, 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.exec(`insert into public.administrators(user_id,display_name,active) values('${ADMIN}','Admin',true);`);
});
afterAll(async () => { await db?.close(); });

describe('provider inherited grants and least privilege migration', () => {
  it('models broad provider grants before hardening while RLS still blocks row writes', async () => {
    expect((await db.query("select has_table_privilege('anon','public.posts','INSERT') as broad")).rows).toEqual([{ broad: true }]);
    await expect(as('anon', '', "insert into public.posts(slug,title) values('denied-before','Forbidden')")).rejects.toThrow(/row-level security/);
    await expect(as('authenticated', OTHER, "insert into public.posts(slug,title) values('denied-other','Forbidden')")).rejects.toThrow(/row-level security/);
    expect((await db.query("select has_table_privilege('anon','public.posts','TRUNCATE') as dangerous")).rows).toEqual([{ dangerous: true }]);
    // Do not execute TRUNCATE. RLS does not protect that operation.
  });
  it('matches the migration exactly, applies twice, and removes bypass operations', async () => {
    const sql = await readFile(hardening, 'utf8');
    expect(await readFile('supabase/migrations/20261002032930_benchimol_least_privilege.sql', 'utf8')).toBe(sql);
    await db.exec(sql); await db.exec(sql);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const rows = (await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and (has_table_privilege('${role}',c.oid,'TRUNCATE') or has_table_privilege('${role}',c.oid,'TRIGGER') or has_table_privilege('${role}',c.oid,'REFERENCES'))`)).rows;
      expect(rows).toEqual([]);
    }
  });
  it('preserves only public published reads and denies arbitrary anonymous mutations/RPCs', async () => {
    await db.exec("insert into public.posts(slug,title,status,public_path,published_at) values('visible','Visible','published','/visible/',now()),('hidden','Hidden','draft','/hidden/',null)");
    expect((await as('anon', '', 'select title from public.posts')).rows).toEqual([{ title: 'Visible' }]);
    await expect(as('anon', '', "insert into public.posts(slug,title) values('attack','Attack')")).rejects.toThrow(/permission denied/);
    await expect(as('anon', '', 'select * from public.media')).rejects.toThrow(/permission denied/);
    await expect(as('anon', '', "select public.create_post('{\"title\":\"Attack\",\"slug\":\"attack\"}')")).rejects.toThrow(/permission denied/);
  });
  it('keeps authenticated non-admins unprivileged and server-only limiting restricted', async () => {
    expect((await as('authenticated', OTHER, 'select title from public.posts')).rows).toEqual([{ title: 'Visible' }]);
    expect((await as('authenticated', OTHER, 'select * from public.media')).rows).toEqual([]);
    await expect(as('authenticated', OTHER, "select public.create_post('{\"title\":\"Attack\",\"slug\":\"attack\"}')")).rejects.toThrow(/not_admin/);
    await expect(as('authenticated', ADMIN, `select public.consume_login_attempt('${'a'.repeat(64)}',8)`)).rejects.toThrow(/permission denied/);
    await expect(as('service_role', '', 'select * from public.posts')).rejects.toThrow(/permission denied/);
    expect((await as('service_role', '', `select public.consume_login_attempt('${'a'.repeat(64)}',8) as allowed`)).rows).toEqual([{ allowed: true }]);
  });
  it('preserves complete admin post, settings, redirect, media and upload CRUD within narrow columns', async () => {
    const created = await as('authenticated', ADMIN, "select to_jsonb(public.create_post('{\"title\":\"Admin\",\"slug\":\"admin-created\"}')) as post");
    const id = (created.rows[0] as { post: { id: string } }).post.id;
    await as('authenticated', ADMIN, `select public.save_post('${id}',1,'{"status":"published","slug":"admin-renamed"}')`);
    expect((await as('anon', '', "select to_path from public.redirects where from_path='/admin-created/'")).rows).toEqual([{ to_path: '/admin-renamed/' }]);
    await as('authenticated', ADMIN, `select public.save_post('${id}',2,'{"status":"trashed"}')`);
    await as('authenticated', ADMIN, `select public.restore_post('${id}',3,null)`);
    await as('authenticated', ADMIN, `select public.save_settings('contact',1,'{"whatsapp":"5521987654321","message":"Teste"}')`);
    const revision = (await as('authenticated', ADMIN, "select id from public.settings_revisions where key='contact'")).rows[0] as { id: string };
    await as('authenticated', ADMIN, `select public.restore_contact_settings(2,'${revision.id}')`);
    const mediaId = '33333333-3333-4333-8333-333333333333';
    await as('authenticated', ADMIN, `insert into public.media(id,url,storage_path,mime_type,bytes,width,height) values('${mediaId}','/api/media/${mediaId}','${ADMIN}/fixture.png','image/png',20,2,2)`);
    await as('authenticated', ADMIN, `update public.media set alt='Alt',caption='Caption' where id='${mediaId}'`);
    await expect(as('authenticated', ADMIN, `update public.media set storage_path='wrong.png' where id='${mediaId}'`)).rejects.toThrow(/permission denied/);
    await as('authenticated', ADMIN, `delete from public.media where id='${mediaId}'`);
    await as('authenticated', ADMIN, `insert into public.media_uploads(id,user_id,storage_path,mime_type,bytes,alt,caption) values('${mediaId}','${ADMIN}','${ADMIN}/fixture.png','image/png',20,'Alt','Caption')`);
    await as('authenticated', ADMIN, `delete from public.media_uploads where id='${mediaId}'`);
    await expect(as('authenticated', ADMIN, 'update public.administrators set active=false')).rejects.toThrow(/permission denied/);
    await expect(as('authenticated', ADMIN, 'delete from public.posts')).rejects.toThrow(/permission denied/);
    await expect(as('authenticated', ADMIN, 'delete from public.post_revisions')).rejects.toThrow(/permission denied/);
  });
  it('keeps future postgres application objects inaccessible until explicit grants', async () => {
    await db.exec("create table public.future_table(id int); create sequence public.future_seq; create function public.future_fn() returns int language sql as $$select 1$$;");
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query(`select has_table_privilege('${role}','public.future_table','SELECT') as table_access,
        has_sequence_privilege('${role}','public.future_seq','USAGE') as sequence_access,
        has_function_privilege('${role}','public.future_fn()','EXECUTE') as function_access`)).rows).toEqual([{ table_access: false, sequence_access: false, function_access: false }]);
    }
    // The migration never changes existing provider objects.
    expect((await db.query("select has_function_privilege('authenticated','auth.uid()','EXECUTE') as allowed")).rows).toEqual([{ allowed: true }]);
  });
});
