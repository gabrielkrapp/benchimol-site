import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const ADMIN='11111111-1111-4111-8111-111111111111', OTHER='22222222-2222-4222-8222-222222222222';
let db:PGlite;
async function as(role:string, uid:string, sql:string) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false);`);
  try { return await db.query(sql); } finally { await db.exec('reset role;'); }
}
beforeAll(async () => {
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values ('${ADMIN}'),('${OTHER}');`);
  await db.exec(await readFile('supabase/schemas/01_editorial.sql','utf8'));
  await db.exec(await readFile('supabase/schemas/02_mutations.sql','utf8'));
  await db.exec(await readFile('supabase/seed.sql','utf8'));
  await db.exec(`insert into public.administrators(user_id,display_name,active) values('${ADMIN}','Admin',true);`);
});
afterAll(async()=>{await db?.close()});
describe('actual SQL grants, RLS and concurrency',()=>{
  it('anonymous and authenticated non-admin cannot read drafts or write',async()=>{
    await as('authenticated',ADMIN,`select public.create_post('{"title":"Privado","slug":"privado","bodyHtml":"<p>privado</p>"}'::jsonb)`);
    expect((await as('anon','', 'select * from public.posts')).rows).toHaveLength(0);
    expect((await as('authenticated',OTHER,'select * from public.posts')).rows).toHaveLength(0);
    await expect(as('authenticated',OTHER,`select public.create_post('{"title":"Ataque","slug":"ataque"}')`)).rejects.toThrow();
    await expect(as('anon','',`select * from public.post_revisions`)).rejects.toThrow();
  });
  it('saves one revision per update and rejects a competing stale version',async()=>{
    const result=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"Teste","slug":"teste"}')) as post`);
    const post=(result.rows[0] as any).post;
    await as('authenticated',ADMIN,`select public.save_post('${post.id}',1,'{"status":"published","title":"Publicado"}')`);
    await expect(as('authenticated',ADMIN,`select public.save_post('${post.id}',1,'{"status":"draft","title":"Sobrescrita"}')`)).rejects.toThrow(/version_conflict/);
    expect((await as('anon','',`select title from public.posts where id='${post.id}'`)).rows).toEqual([{title:'Publicado'}]);
    const revisions=await as('authenticated',ADMIN,`select snapshot->>'title' as title from public.post_revisions where post_id='${post.id}'`);
    expect(revisions.rows).toEqual([{title:'Teste'}]);
    await as('authenticated',ADMIN,`select public.save_post('${post.id}',2,'{"status":"trashed"}')`);
    expect((await as('anon','',`select * from public.posts where id='${post.id}'`)).rows).toHaveLength(0);
    await as('authenticated',ADMIN,`select public.restore_post('${post.id}',3,null)`);
    expect((await as('authenticated',ADMIN,`select status from public.posts where id='${post.id}'`)).rows).toEqual([{status:'draft'}]);
  });
  it('revoking admin blocks fresh operations even with the same identity',async()=>{
    await db.exec(`update public.administrators set active=false where user_id='${ADMIN}'`);
    await expect(as('authenticated',ADMIN,`select public.create_post('{"title":"Negado","slug":"negado"}')`)).rejects.toThrow();
    expect((await as('authenticated',ADMIN,'select * from public.post_revisions')).rows).toHaveLength(0);
    await db.exec(`update public.administrators set active=true where user_id='${ADMIN}'`);
  });
  it('prevents published reserved slugs, redirect cycles and reference deletion',async()=>{
    await expect(as('authenticated',ADMIN,`select public.create_post('{"title":"Admin","slug":"admin"}')`)).rejects.toThrow(/slug_reserved/);
    const result=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"Link","slug":"link"}')) as post`);
    const id=(result.rows[0] as any).post.id;
    await as('authenticated',ADMIN,`select public.save_post('${id}',1,'{"status":"published"}')`);
    await as('authenticated',ADMIN,`select public.save_post('${id}',2,'{"status":"published","slug":"link-novo"}')`);
    expect((await as('anon','',`select from_path,to_path from public.redirects where from_path='/link/'`)).rows).toEqual([{from_path:'/link/',to_path:'/link-novo/'}]);
    await expect(as('authenticated',ADMIN,`select public.save_post('${id}',3,'{"status":"published","slug":"link"}')`)).rejects.toThrow(/slug_redirect_reserved/);
    await as('authenticated',ADMIN,`insert into public.media(id,url,mime_type,bytes) values('33333333-3333-4333-8333-333333333333','/cover.webp','image/webp',10)`);
    await as('authenticated',ADMIN,`select public.save_post('${id}',3,'{"status":"published","featuredImage":"/cover.webp"}')`);
    await expect(as('authenticated',ADMIN,`delete from public.media where id='33333333-3333-4333-8333-333333333333'`)).rejects.toThrow(/media_in_use/);
  });
});

it('serializes simultaneous edits so only one expected version succeeds',async()=>{
 const result=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"Concorrência","slug":"concorrencia"}')) as post`);
 const id=(result.rows[0] as any).post.id;
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${ADMIN}',false)`);
 try {
  const writes=await Promise.allSettled([
   db.query(`select public.save_post('${id}',1,'{"status":"draft","title":"Pessoa 1"}')`),
   db.query(`select public.save_post('${id}',1,'{"status":"draft","title":"Pessoa 2"}')`),
  ]);
  expect(writes.filter(w=>w.status==='fulfilled')).toHaveLength(1);
  expect(writes.filter(w=>w.status==='rejected')).toHaveLength(1);
  expect((await db.query(`select version from public.posts where id='${id}'`)).rows).toEqual([{version:2}]);
 } finally {await db.exec('reset role')}
});

it('keeps settings updates optimistic and rate windows shared in the database',async()=>{
 await db.exec(await readFile('supabase/schemas/04_login_limit.sql','utf8'));
 await as('authenticated',ADMIN,`select public.save_settings('popup',1,'{"title":"Aviso","text":"Período","active":true,"startsAt":"2026-10-01T00:00:00Z","endsAt":"2026-10-02T00:00:00Z"}')`);
 await expect(as('authenticated',ADMIN,`select public.save_settings('popup',1,'{"title":"Outra","text":"A","active":false}')`)).rejects.toThrow(/version_conflict/);
 const hash='a'.repeat(64);for(let i=0;i<8;i++)expect((await as('service_role','',`select public.consume_login_attempt('${hash}',8) as allowed`)).rows).toEqual([{allowed:true}]);
 expect((await as('service_role','',`select public.consume_login_attempt('${hash}',8) as allowed`)).rows).toEqual([{allowed:false}]);
 const originHash='b'.repeat(64);for(let i=0;i<24;i++)expect((await as('service_role','',`select public.consume_login_attempt('${originHash}',24) as allowed`)).rows).toEqual([{allowed:true}]);
 expect((await as('service_role','',`select public.consume_login_attempt('${originHash}',24) as allowed`)).rows).toEqual([{allowed:false}]);
 await expect(as('anon','',`select * from private.login_windows`)).rejects.toThrow();
 await expect(as('anon','',`select public.consume_login_attempt('${hash}',8)`)).rejects.toThrow();
 await expect(as('authenticated',ADMIN,`select public.consume_login_attempt('${hash}',8)`)).rejects.toThrow();
});

it('enforces private Storage references for draft, publication, withdrawal and deletion',async()=>{
 await db.exec(`create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;grant insert,delete on storage.objects to authenticated;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 grant execute on function storage.foldername(text) to authenticated;
 create function storage.allow_any_operation(operations text[]) returns boolean language sql stable as $$select coalesce(current_setting('storage.operation',true),'')=any(operations)$$;
 grant execute on function storage.allow_any_operation(text[]) to authenticated;`);
 await db.exec(await readFile('supabase/schemas/03_storage.sql','utf8'));
 const id='44444444-4444-4444-8444-444444444444',path=`${ADMIN}/private.webp`,url=`/api/media/${id}`;
 await as('authenticated',ADMIN,`insert into public.media(id,url,storage_path,mime_type,bytes) values('${id}','${url}','${path}','image/webp',20)`);
 await as('authenticated',ADMIN,`insert into storage.objects(bucket_id,name) values('editorial-media','${path}')`);
 const created=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"Capa privada","slug":"capa-privada","featuredImage":"${url}"}')) as post`),postId=(created.rows[0] as any).post.id;
 expect((await as('anon','',`select name from storage.objects where name='${path}'`)).rows).toHaveLength(0);
 await as('authenticated',ADMIN,`select public.save_post('${postId}',1,'{"status":"published"}')`);
 expect((await as('anon','',`select name from storage.objects where name='${path}'`)).rows).toHaveLength(0);
 expect((await as('anon','',`select id from public.get_public_media('${id}')`)).rows).toEqual([{id}]);
 await db.exec("select set_config('storage.operation','object.delete_many',false)");
 await as('authenticated',ADMIN,`delete from storage.objects where name='${path}'`);
 await db.exec("select set_config('storage.operation','object.get_authenticated',false)");
 expect((await as('authenticated',ADMIN,`select name from storage.objects where name='${path}'`)).rows).toHaveLength(1);
 await as('authenticated',ADMIN,`select public.save_post('${postId}',2,'{"status":"draft"}')`);
 expect((await as('anon','',`select name from storage.objects where name='${path}'`)).rows).toHaveLength(0);
 await expect(as('authenticated',OTHER,`insert into storage.objects(bucket_id,name) values('editorial-media','${OTHER}/attack.webp')`)).rejects.toThrow();
});

it('never exposes a future-dated publication, its redirect, media record or Storage bytes',async()=>{
 const id='77777777-7777-4777-8777-777777777777',postId='88888888-8888-4888-8888-888888888888',path=`${ADMIN}/future.webp`,url=`/api/media/${id}`;
 await db.query('insert into public.media(id,url,storage_path,mime_type,bytes) values($1,$2,$3,$4,$5)',[id,url,path,'image/webp',20]);
 await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['editorial-media',path]);
 await db.query("insert into public.posts(id,slug,legacy_path,public_path,title,status,published_at,featured_image) values($1,'future','/future/','/future/','Ainda privado','published',now()+interval '1 day',$2)",[postId,url]);
 await db.query("insert into public.redirects(from_path,to_path,post_id) values('/future-antigo/','/future/',$1)",[postId]);
 expect((await as('anon','',`select * from public.posts where id='${postId}'`)).rows).toHaveLength(0);
 expect((await as('anon','',`select * from public.redirects where post_id='${postId}'`)).rows).toHaveLength(0);
 expect((await as('anon','',`select * from public.get_public_media('${id}')`)).rows).toHaveLength(0);
 expect((await as('anon','',`select * from storage.objects where name='${path}'`)).rows).toHaveLength(0);
});

it('disallows Storage signing even for an active admin while retaining authenticated download access',async()=>{
 await db.exec("select set_config('storage.operation','object.sign',false)");
 expect((await as('authenticated',ADMIN,'select * from storage.objects')).rows).toHaveLength(0);
 await db.exec("select set_config('storage.operation','object.sign_many',false)");
 expect((await as('authenticated',ADMIN,'select * from storage.objects')).rows).toHaveLength(0);
 await db.exec("select set_config('storage.operation','object.get_authenticated',false)");
 expect((await as('authenticated',ADMIN,'select * from storage.objects')).rows.length).toBeGreaterThan(0);
});

it('makes OG-only media public only during publication and preserves references in private revisions',async()=>{
 const id='99999999-9999-4999-8999-999999999999',url=`/api/media/${id}`,path=`${ADMIN}/seo.webp`;
 await as('authenticated',ADMIN,`insert into public.media(id,url,storage_path,mime_type,bytes) values('${id}','${url}','${path}','image/webp',10)`);
 await as('authenticated',ADMIN,`insert into storage.objects(bucket_id,name) values('editorial-media','${path}')`);
 const created=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"SEO privado","slug":"seo-privado","seo":{"title":"A","description":"B","ogImage":"https://clinicadeolhosbenchimol.com.br${url}"}}')) as post`),postId=(created.rows[0] as any).post.id;
 expect((await as('anon','',`select id from public.get_public_media('${id}')`)).rows).toHaveLength(0);
 await expect(as('authenticated',ADMIN,`delete from public.media where id='${id}'`)).rejects.toThrow(/media_in_use/);
 await as('authenticated',ADMIN,`select public.save_post('${postId}',1,'{"status":"published"}')`);
 expect((await as('anon','',`select id from public.get_public_media('${id}')`)).rows).toEqual([{id}]);
 await as('authenticated',ADMIN,`select public.save_post('${postId}',2,'{"status":"draft","seo":{"title":"A","description":"B"}}')`);
 expect((await as('anon','',`select id from public.get_public_media('${id}')`)).rows).toHaveLength(0);
 await expect(as('authenticated',ADMIN,`delete from public.media where id='${id}'`)).rejects.toThrow(/media_in_use/);
 await db.exec("select set_config('storage.operation','object.delete_many',false)");
 await as('authenticated',ADMIN,`delete from storage.objects where name='${path}'`);
 await db.exec("select set_config('storage.operation','object.get_authenticated',false)");
 expect((await as('authenticated',ADMIN,`select name from storage.objects where name='${path}'`)).rows).toEqual([{name:path}]);
 await expect(as('authenticated',ADMIN,`select public.create_post('{"title":"Sem mídia","slug":"seo-sem-midia","seo":{"title":"A","description":"B","ogImage":"/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}}')`)).rejects.toThrow(/media_not_found/);
});

it('recovers an earlier contact without overwriting a competing version and keeps history private and immutable',async()=>{
 const initial=(await db.query("select value,version from public.settings where key='contact'")).rows[0] as any;
 await as('authenticated',ADMIN,`select public.save_settings('contact',${initial.version},'{"whatsapp":"5521999991234","message":"Novo contato"}')`);
 const history=(await as('authenticated',ADMIN,"select id,version,actor_name,snapshot from public.settings_revisions where key='contact' order by version")).rows as any[];
 expect(history).toHaveLength(1);expect(history[0].snapshot.value).toEqual(initial.value);expect(history[0].actor_name).toBe('Admin');
 await expect(as('anon','',"select * from public.settings_revisions")).rejects.toThrow();
 expect((await as('authenticated',OTHER,"select * from public.settings_revisions")).rows).toHaveLength(0);
 await expect(as('authenticated',ADMIN,"delete from public.settings_revisions")).rejects.toThrow();
 await expect(as('authenticated',ADMIN,`select public.restore_contact_settings(${initial.version},'${history[0].id}')`)).rejects.toThrow(/version_conflict/);
 await as('authenticated',ADMIN,`select public.restore_contact_settings(${initial.version+1},'${history[0].id}')`);
 expect((await db.query("select value,version from public.settings where key='contact'")).rows).toEqual([{value:initial.value,version:initial.version+2}]);
 expect((await as('authenticated',ADMIN,"select version from public.settings_revisions where key='contact' order by version")).rows).toEqual([{version:initial.version},{version:initial.version+1}]);
 const popup=(await db.query("select id from public.settings_revisions where key='popup' limit 1")).rows[0] as any;
 await expect(as('authenticated',ADMIN,`select public.restore_contact_settings(${initial.version+2},'${popup.id}')`)).rejects.toThrow(/not_found/);
 await expect(as('authenticated',OTHER,`select public.restore_contact_settings(${initial.version+2},'${history[0].id}')`)).rejects.toThrow(/not_admin/);
});

it('retargets the previous default canonical on slug changes and preserves a custom canonical',async()=>{
 const created=await as('authenticated',ADMIN,`select to_jsonb(public.create_post('{"title":"Canônica","slug":"canonica","seo":{"title":"A","description":"B","canonical":"https://clinicadeolhosbenchimol.com.br/canonica/"}}')) as post`),id=(created.rows[0] as any).post.id;
 await as('authenticated',ADMIN,`select public.save_post('${id}',1,'{"status":"published","slug":"canonica-nova","seo":{"title":"A","description":"B","canonical":"https://clinicadeolhosbenchimol.com.br/canonica/"}}')`);
 expect((await db.query(`select seo->>'canonical' as canonical from public.posts where id='${id}'`)).rows).toEqual([{canonical:'https://clinicadeolhosbenchimol.com.br/canonica-nova/'}]);
 await as('authenticated',ADMIN,`select public.save_post('${id}',2,'{"status":"published","slug":"canonica-custom","seo":{"title":"A","description":"B","canonical":"https://example.com/conteudo/"}}')`);
 expect((await db.query(`select seo->>'canonical' as canonical from public.posts where id='${id}'`)).rows).toEqual([{canonical:'https://example.com/conteudo/'}]);
 const prior=(await db.query(`select id from public.post_revisions where post_id='${id}' and version=1`)).rows[0] as any;
 await as('authenticated',ADMIN,`select public.restore_post('${id}',3,'${prior.id}')`);
 expect((await db.query(`select slug,seo->>'canonical' as canonical from public.posts where id='${id}'`)).rows).toEqual([{slug:'canonica-custom',canonical:'https://clinicadeolhosbenchimol.com.br/canonica-custom/'}]);
});
