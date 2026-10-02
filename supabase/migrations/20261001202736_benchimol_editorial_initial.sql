-- Initial Benchimol schema + private bucket + reference settings.
-- Generated from reviewed declarative sources; apply only to an empty clinic database.

-- SOURCE: supabase/schemas/01_editorial.sql
-- Declarative desired state. Generate/review a migration locally before manual application.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

create table public.administrators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null, active boolean not null default false, created_at timestamptz not null default now()
);
alter table public.administrators enable row level security;
grant select on public.administrators to authenticated;
create policy admin_own_record on public.administrators for select to authenticated using (user_id=(select auth.uid()));
create function private.is_active_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.administrators where user_id=(select auth.uid()) and active);
$$;
revoke all on function private.is_active_admin() from public;
grant execute on function private.is_active_admin() to authenticated;

create table public.reserved_routes(path text primary key);
grant select on public.reserved_routes to anon,authenticated;
alter table public.reserved_routes enable row level security;
create policy reserved_public on public.reserved_routes for select to anon,authenticated using(true);

create table public.posts (
 id uuid primary key default gen_random_uuid(), wp_id bigint unique,
 slug text not null unique check(slug ~ '^[a-z0-9]+([-_][a-z0-9]+)*$' and length(slug)<=200),
 legacy_path text not null default '', public_path text unique,
 title text not null check(length(title) between 1 and 300), excerpt_html text not null default '', body_html text not null default '', author_name text not null default 'Clínica de Olhos Benchimol',
 status text not null default 'draft' check(status in ('draft','published','trashed')),
 published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0), featured_image text, featured_alt text not null default '',
 category_ids bigint[] not null default '{}', tag_ids bigint[] not null default '{}', seo jsonb not null default '{"title":"","description":""}',
 body_edit_mode text not null default 'rich' check(body_edit_mode in ('rich','legacy')), publication_sync text not null default 'current' check(publication_sync in ('current','pending')),
 source_hash text, updated_by uuid references auth.users(id),
 check(public_path is null or public_path='/'||slug||'/')
);
create index posts_public_date on public.posts(published_at desc,id) where status='published' and public_path is not null;
create index posts_updated on public.posts(updated_at desc,id);
create index posts_categories on public.posts using gin(category_ids);
create index posts_tags on public.posts using gin(tag_ids);
alter table public.posts enable row level security;
grant select on public.posts to anon,authenticated;
grant insert(slug,legacy_path,public_path,title,excerpt_html,body_html,author_name,featured_image,featured_alt,category_ids,tag_ids,seo,published_at,updated_by) on public.posts to authenticated;
grant update(slug,public_path,title,excerpt_html,body_html,author_name,status,featured_image,featured_alt,category_ids,tag_ids,seo,published_at,version,publication_sync) on public.posts to authenticated;
create policy posts_public on public.posts for select to anon,authenticated using(status='published' and public_path is not null and published_at is not null and published_at<=now());
create policy posts_admin_select on public.posts for select to authenticated using((select private.is_active_admin()));
create policy posts_admin_insert on public.posts for insert to authenticated with check((select private.is_active_admin()));
create policy posts_admin_update on public.posts for update to authenticated using((select private.is_active_admin())) with check((select private.is_active_admin()));

create table public.post_revisions (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id), version integer not null,
 created_at timestamptz not null default now(), actor_id uuid references auth.users(id), actor_name text not null,
 snapshot jsonb not null, unique(post_id,version)
);
create index revisions_post_date on public.post_revisions(post_id,created_at desc);
alter table public.post_revisions enable row level security;
grant select on public.post_revisions to authenticated;
create policy revisions_admin_select on public.post_revisions for select to authenticated using((select private.is_active_admin()));

create table public.redirects (
 from_path text primary key check(from_path ~ '^/[a-z0-9_-]+/$'), to_path text not null check(to_path ~ '^/[a-z0-9_-]+/$'),
 post_id uuid not null references public.posts(id), created_at timestamptz not null default now(), check(from_path<>to_path)
);
create index redirects_post_id on public.redirects(post_id);
alter table public.redirects enable row level security;
grant select on public.redirects to anon,authenticated;
grant insert,update on public.redirects to authenticated;
create policy redirects_public on public.redirects for select to anon,authenticated using(exists(select 1 from public.posts where id=post_id and status='published' and public_path is not null and published_at is not null and published_at<=now()));
create policy redirects_admin_read on public.redirects for select to authenticated using((select private.is_active_admin()));
create policy redirects_admin_insert on public.redirects for insert to authenticated with check((select private.is_active_admin()));
create policy redirects_admin_update on public.redirects for update to authenticated using((select private.is_active_admin())) with check((select private.is_active_admin()));

create table public.taxonomies (
 kind text not null check(kind in('category','tag')), wp_id bigint not null, slug text not null, name text not null,
 primary key(kind,wp_id), unique(kind,slug)
);
alter table public.taxonomies enable row level security;
grant select on public.taxonomies to anon,authenticated;
create policy taxonomies_public on public.taxonomies for select to anon,authenticated using(true);

create table public.media (
 id uuid primary key default gen_random_uuid(), wp_id bigint unique, url text not null unique, original_url text,
 storage_path text unique, mime_type text not null, bytes bigint not null check(bytes>=0), width integer,height integer,
 alt text not null default '',caption text not null default '',created_at timestamptz not null default now()
);
alter table public.media enable row level security;
grant select,insert,update,delete on public.media to authenticated;
create policy media_admin on public.media for all to authenticated using((select private.is_active_admin())) with check((select private.is_active_admin()));

create table public.settings (
 key text primary key check(key in('popup','contact')), value jsonb not null, version integer not null default 1,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
alter table public.settings enable row level security;
grant select on public.settings to anon,authenticated;
grant update on public.settings to authenticated;
create policy settings_public on public.settings for select to anon,authenticated using(true);
create policy settings_admin_update on public.settings for update to authenticated using((select private.is_active_admin())) with check((select private.is_active_admin()));

create table public.settings_revisions (
 id uuid primary key default gen_random_uuid(),key text not null references public.settings(key),version integer not null,
 created_at timestamptz not null default now(),actor_id uuid references auth.users(id),actor_name text not null,snapshot jsonb not null,unique(key,version)
);
alter table public.settings_revisions enable row level security;
grant select on public.settings_revisions to authenticated;
create policy settings_revisions_admin on public.settings_revisions for select to authenticated using((select private.is_active_admin()));
create function private.audit_settings_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.settings_revisions(key,version,actor_id,actor_name,snapshot)
 values(old.key,old.version,auth.uid(),coalesce((select display_name from public.administrators where user_id=auth.uid()),'Operação manual'),to_jsonb(old));
 return new;
end; $$;
revoke all on function private.audit_settings_change() from public,anon,authenticated;
create trigger audit_settings_change before update on public.settings for each row execute function private.audit_settings_change();

create table public.operation_events (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in('export','restore','import')),created_at timestamptz not null default now(),source text not null,details jsonb not null default '{}'
);
alter table public.operation_events enable row level security;
grant select on public.operation_events to authenticated;
create policy operations_admin on public.operation_events for select to authenticated using((select private.is_active_admin()));

-- Database-maintained immutable revision history, inaccessible for direct client writes.
create function private.audit_post_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (to_jsonb(new)-'publication_sync')=(to_jsonb(old)-'publication_sync') then return new; end if;
 if new.version<>old.version+1 then raise exception 'version_conflict' using errcode='40001'; end if;
 if old.body_edit_mode='legacy' and new.body_html<>old.body_html and auth.uid() is not null then raise exception 'legacy_body_locked' using errcode='22023'; end if;
 insert into public.post_revisions(post_id,version,actor_id,actor_name,snapshot)
 values(old.id,old.version,auth.uid(),coalesce((select display_name from public.administrators where user_id=auth.uid()),'Importação manual'),to_jsonb(old));
 new.updated_at=now(); new.updated_by=auth.uid(); return new;
end; $$;
revoke all on function private.audit_post_change() from public,anon,authenticated;
create trigger audit_post_change before update on public.posts for each row execute function private.audit_post_change();

create function private.guard_post_path() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.public_path is not null or new.wp_id is null) and exists(select 1 from public.reserved_routes where path='/'||new.slug||'/') then raise exception 'slug_reserved' using errcode='23505'; end if;
 if new.public_path is not null and exists(select 1 from public.redirects where from_path=new.public_path) then raise exception 'slug_redirect_reserved' using errcode='23505'; end if;
 return new;
end; $$;
revoke all on function private.guard_post_path() from public;
create trigger guard_post_path before insert or update on public.posts for each row execute function private.guard_post_path();

-- Normalize absolute OG references as well as local media URLs; snapshots use camelCase SEO keys.
create function private.media_url_path(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select regexp_replace(regexp_replace(value,'^https?://[^/?#]+','','i'),'[?#].*$','');
$$;
revoke all on function private.media_url_path(text) from public;
grant execute on function private.media_url_path(text) to authenticated;
-- Search all states AND historical revisions: deleting an image must never break restoration.
create function private.guard_media_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.posts where featured_image=old.url or position(old.url in body_html)>0 or private.media_url_path(seo->>'ogImage')=old.url)
 or exists(select 1 from public.post_revisions where snapshot->>'featured_image'=old.url or position(old.url in (snapshot->>'body_html'))>0 or private.media_url_path(snapshot->'seo'->>'ogImage')=old.url) then
   raise exception 'media_in_use' using errcode='23503';
 end if; return old;
end; $$;
revoke all on function private.guard_media_delete() from public,anon,authenticated;
create trigger guard_media_delete before delete on public.media for each row execute function private.guard_media_delete();

create function private.guard_managed_media_references() returns trigger language plpgsql security invoker set search_path='' as $$
declare target text;
begin
 for target in select distinct value from unnest(array[new.featured_image,private.media_url_path(new.seo->>'ogImage')] || array(select (matches)[1] from regexp_matches(new.body_html,'(/api/media/[a-f0-9-]{36})','g') as matches)) value where value like '/api/media/%' loop
   perform 1 from public.media where url=target for share;
   if not found then raise exception 'media_not_found' using errcode='23503'; end if;
 end loop;
 return new;
end; $$;
revoke all on function private.guard_managed_media_references() from public;
create trigger guard_managed_media_references before insert or update on public.posts for each row execute function private.guard_managed_media_references();

create table public.media_uploads(
 id uuid primary key,user_id uuid not null references auth.users(id),storage_path text not null unique,
 mime_type text not null check(mime_type in('image/jpeg','image/png','image/webp','image/gif')),
 bytes bigint not null check(bytes between 1 and 10485760),alt text not null default '',caption text not null default '',created_at timestamptz not null default now()
);
alter table public.media_uploads enable row level security;
grant select,insert,delete on public.media_uploads to authenticated;
create policy own_upload_intents on public.media_uploads for all to authenticated using(user_id=(select auth.uid()) and (select private.is_active_admin())) with check(user_id=(select auth.uid()) and (select private.is_active_admin()));

create function private.validate_settings_value() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.key<>old.key or new.version<>old.version+1) then raise exception 'version_conflict' using errcode='40001'; end if;
 if new.key='popup' then
   if jsonb_typeof(new.value->'active') is distinct from 'boolean' or jsonb_typeof(new.value->'title') is distinct from 'string' or jsonb_typeof(new.value->'text') is distinct from 'string'
   or length(new.value->>'title')>200 or length(new.value->>'text')>5000 then raise exception 'invalid_popup' using errcode='22023'; end if;
   if new.value->>'startsAt' is not null and new.value->>'endsAt' is not null and (new.value->>'startsAt')::timestamptz >= (new.value->>'endsAt')::timestamptz then raise exception 'invalid_period' using errcode='22023'; end if;
 elsif new.key='contact' then
   if new.value->>'whatsapp' is null or (new.value->>'whatsapp') !~ '^55[1-9][0-9][0-9]{8,9}$' or jsonb_typeof(new.value->'message') is distinct from 'string' or length(new.value->>'message')>1000 then raise exception 'invalid_contact' using errcode='22023'; end if;
 end if; return new;
end; $$;
revoke all on function private.validate_settings_value() from public;
create trigger validate_settings_value before insert or update on public.settings for each row execute function private.validate_settings_value();


-- SOURCE: supabase/schemas/02_mutations.sql
create function public.create_post(payload jsonb) returns public.posts language plpgsql security invoker set search_path='' as $$
declare result public.posts;
begin
 if not private.is_active_admin() then raise exception 'not_admin' using errcode='42501'; end if;
 insert into public.posts(slug,legacy_path,public_path,title,excerpt_html,body_html,author_name,featured_image,featured_alt,category_ids,tag_ids,seo,published_at,updated_by)
 values(payload->>'slug','/'||(payload->>'slug')||'/','/'||(payload->>'slug')||'/',payload->>'title',coalesce(payload->>'excerptHtml',''),coalesce(payload->>'bodyHtml',''),coalesce(payload->>'authorName','Clínica de Olhos Benchimol'),payload->>'featuredImage',coalesce(payload->>'featuredAlt',''),
 array(select jsonb_array_elements_text(coalesce(payload->'categoryIds','[]'))::bigint),array(select jsonb_array_elements_text(coalesce(payload->'tagIds','[]'))::bigint),coalesce(payload->'seo','{"title":"","description":""}'),(payload->>'publishedAt')::timestamptz,auth.uid()) returning * into result;
 return result;
end; $$;
create function public.save_post(post_id uuid,expected_version integer,payload jsonb) returns public.posts language plpgsql security invoker set search_path='' as $$
declare current public.posts; result public.posts; new_slug text; next_seo jsonb;
begin
 if not private.is_active_admin() then raise exception 'not_admin' using errcode='42501'; end if;
 select * into current from public.posts where id=post_id for update;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 if current.version<>expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
 if payload->>'status' not in('draft','published','trashed') or not (payload?'status') then raise exception 'invalid_status' using errcode='22023'; end if;
 new_slug=coalesce(payload->>'slug',current.slug);
 next_seo=coalesce(payload->'seo',current.seo);
 -- Preserve deliberately custom canonicals; retarget only the previous clinic self URL.
 if new_slug<>current.slug and current.public_path is not null and next_seo->>'canonical'='https://clinicadeolhosbenchimol.com.br'||current.public_path then
   next_seo=jsonb_set(next_seo,'{canonical}',to_jsonb('https://clinicadeolhosbenchimol.com.br/'||new_slug||'/'));
 end if;
 if current.public_path is null and payload->>'status'='published' and new_slug=current.slug then raise exception 'collision_unresolved' using errcode='23505'; end if;
 if new_slug<>current.slug then
   if exists(select 1 from public.reserved_routes where path='/'||new_slug||'/') then raise exception 'slug_reserved' using errcode='23505'; end if;
   if exists(select 1 from public.redirects where from_path='/'||new_slug||'/') then raise exception 'slug_redirect_reserved' using errcode='23505'; end if;
 end if;
 update public.posts set slug=new_slug,public_path=case when current.public_path is null and new_slug=current.slug then null else '/'||new_slug||'/' end,
 title=coalesce(payload->>'title',current.title),excerpt_html=coalesce(payload->>'excerptHtml',current.excerpt_html),body_html=coalesce(payload->>'bodyHtml',current.body_html),
 author_name=coalesce(payload->>'authorName',current.author_name),status=payload->>'status',
 featured_image=case when payload?'featuredImage' then payload->>'featuredImage' else current.featured_image end,
 featured_alt=coalesce(payload->>'featuredAlt',current.featured_alt),
 category_ids=case when payload?'categoryIds' then array(select jsonb_array_elements_text(payload->'categoryIds')::bigint) else current.category_ids end,
 tag_ids=case when payload?'tagIds' then array(select jsonb_array_elements_text(payload->'tagIds')::bigint) else current.tag_ids end,
 seo=next_seo,published_at=case when payload?'publishedAt' then (payload->>'publishedAt')::timestamptz when payload->>'status'='published' then coalesce(current.published_at,now()) else current.published_at end,
 version=current.version+1,publication_sync='current'
 where id=post_id returning * into result;
 if new_slug<>current.slug and current.public_path is not null then
   -- Retarget all older aliases directly; no redirect chains.
   update public.redirects set to_path=result.public_path where redirects.post_id=current.id;
   insert into public.redirects(from_path,to_path,post_id) values(current.public_path,result.public_path,current.id);
 end if;
 return result;
end; $$;
create function public.restore_post(post_id uuid,expected_version integer,revision_id uuid default null) returns public.posts language plpgsql security invoker set search_path='' as $$
declare current public.posts; historical jsonb; payload jsonb; restored_seo jsonb;
begin
 if not private.is_active_admin() then raise exception 'not_admin' using errcode='42501'; end if;
 select * into current from public.posts where id=post_id for update;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 if current.version<>expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
 if revision_id is null then
   if current.status<>'trashed' then raise exception 'not_trashed' using errcode='22023'; end if;
   return public.save_post(post_id,expected_version,'{"status":"draft"}');
 end if;
 select snapshot into historical from public.post_revisions where id=revision_id and post_revisions.post_id=current.id;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 -- Restore editorial content in the current URL: prior URLs remain redirects.
 restored_seo=historical->'seo';
 if current.public_path is not null and restored_seo->>'canonical'='https://clinicadeolhosbenchimol.com.br'||(historical->>'public_path') then
   restored_seo=jsonb_set(restored_seo,'{canonical}',to_jsonb('https://clinicadeolhosbenchimol.com.br'||current.public_path));
 end if;
 payload=jsonb_build_object('status','draft','title',historical->>'title','excerptHtml',historical->>'excerpt_html','bodyHtml',historical->>'body_html','authorName',historical->>'author_name','featuredImage',historical->>'featured_image','featuredAlt',historical->>'featured_alt','categoryIds',historical->'category_ids','tagIds',historical->'tag_ids','seo',restored_seo,'publishedAt',historical->>'published_at');
 return public.save_post(post_id,expected_version,payload);
end; $$;
create function public.save_settings(setting_key text,expected_version integer,payload jsonb) returns public.settings language plpgsql security invoker set search_path='' as $$
declare current public.settings; result public.settings;
begin
 if not private.is_active_admin() then raise exception 'not_admin' using errcode='42501'; end if;
 select * into current from public.settings where key=setting_key for update;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 if current.version<>expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
 if setting_key='popup' then
   if jsonb_typeof(payload->'active')<>'boolean' or length(payload->>'text')>5000 or length(payload->>'title')>200 then raise exception 'invalid_popup' using errcode='22023'; end if;
   if payload->>'startsAt' is not null and payload->>'endsAt' is not null and (payload->>'startsAt')::timestamptz >= (payload->>'endsAt')::timestamptz then raise exception 'invalid_period' using errcode='22023'; end if;
 elsif setting_key='contact' then
   if (payload->>'whatsapp') !~ '^55[1-9][0-9][0-9]{8,9}$' or length(payload->>'message')>1000 then raise exception 'invalid_contact' using errcode='22023'; end if;
 else raise exception 'invalid_setting' using errcode='22023'; end if;
 update public.settings set value=payload,version=current.version+1,updated_at=now(),updated_by=auth.uid() where key=setting_key returning * into result;
 return result;
end; $$;
create function public.restore_contact_settings(expected_version integer,revision_id uuid) returns public.settings language plpgsql security invoker set search_path='' as $$
declare current public.settings; historical jsonb;
begin
 if not private.is_active_admin() then raise exception 'not_admin' using errcode='42501'; end if;
 select * into current from public.settings where key='contact' for update;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 if current.version<>expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
 select snapshot into historical from public.settings_revisions where id=revision_id and key='contact';
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 return public.save_settings('contact',expected_version,historical->'value');
end; $$;
revoke all on function public.create_post(jsonb),public.save_post(uuid,integer,jsonb),public.restore_post(uuid,integer,uuid),public.save_settings(text,integer,jsonb),public.restore_contact_settings(integer,uuid) from public,anon;
grant execute on function public.create_post(jsonb),public.save_post(uuid,integer,jsonb),public.restore_post(uuid,integer,uuid),public.save_settings(text,integer,jsonb),public.restore_contact_settings(integer,uuid) to authenticated;


-- SOURCE: supabase/schemas/03_storage.sql
-- Run only in the clinic Supabase with Storage installed; never a public bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('editorial-media','editorial-media',false,10485760,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function private.is_public_media_path(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media m join public.posts p on (p.featured_image=m.url or position(m.url in p.body_html)>0 or private.media_url_path(p.seo->>'ogImage')=m.url)
 where m.storage_path=object_path and p.status='published' and p.public_path is not null and p.published_at is not null and p.published_at<=now());
$$;
create function private.is_deletable_media_path(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.administrators where user_id=auth.uid() and active)
 and not exists(select 1 from public.media m join public.posts p on(p.featured_image=m.url or position(m.url in p.body_html)>0 or private.media_url_path(p.seo->>'ogImage')=m.url) where m.storage_path=object_path)
 and not exists(select 1 from public.media m join public.post_revisions r on(r.snapshot->>'featured_image'=m.url or position(m.url in (r.snapshot->>'body_html'))>0 or private.media_url_path(r.snapshot->'seo'->>'ogImage')=m.url) where m.storage_path=object_path);
$$;
create function private.public_media(media_id uuid) returns setof public.media language sql stable security definer set search_path='' as $$
 select m.* from public.media m where m.id=media_id and private.is_public_media_path(m.storage_path);
$$;
revoke all on function private.is_public_media_path(text),private.is_deletable_media_path(text),private.public_media(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.is_public_media_path(text),private.public_media(uuid) to anon,authenticated;
grant execute on function private.is_deletable_media_path(text) to authenticated;
create function public.get_public_media(media_id uuid) returns setof public.media language sql stable security invoker set search_path='' as $$ select * from private.public_media(media_id); $$;
revoke all on function public.get_public_media(uuid) from public;
grant execute on function public.get_public_media(uuid) to anon,authenticated;
-- Visitors cannot call Storage sign APIs directly: only the server signs fixed 60-second downloads.
create policy editorial_read_admin on storage.objects for select to authenticated using(bucket_id='editorial-media' and (select private.is_active_admin()) and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.delete','object.delete_many']));
create policy editorial_upload_admin on storage.objects for insert to authenticated with check(bucket_id='editorial-media' and (select private.is_active_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy editorial_delete_admin on storage.objects for delete to authenticated using(bucket_id='editorial-media' and private.is_deletable_media_path(name));
-- No UPDATE/upsert policy: immutable random paths avoid replacing referenced assets.


-- SOURCE: supabase/schemas/04_login_limit.sql
-- Shared rate window; no credentials/email/IP are stored, only server HMAC identifiers.
create table private.login_windows(bucket text primary key,attempts integer not null,reset_at timestamptz not null);
alter table private.login_windows enable row level security;
revoke all on private.login_windows from public,anon,authenticated;
create function private.consume_login_bucket(bucket_hash text,max_attempts integer) returns boolean language plpgsql security definer set search_path='' as $$
declare attempts_now integer;
begin
 if bucket_hash !~ '^[a-f0-9]{64}$' or max_attempts not between 1 and 30 then raise exception 'invalid_bucket' using errcode='22023'; end if;
 insert into private.login_windows(bucket,attempts,reset_at) values(bucket_hash,1,now()+interval '15 minutes')
 on conflict(bucket) do update set attempts=case when private.login_windows.reset_at<=now() then 1 else least(private.login_windows.attempts+1,max_attempts+1) end,
 reset_at=case when private.login_windows.reset_at<=now() then now()+interval '15 minutes' else private.login_windows.reset_at end
 returning attempts into attempts_now;
 -- Bounded maintenance; expired hashes contain no personal data.
 delete from private.login_windows where reset_at<now()-interval '1 day';
 return attempts_now<=max_attempts;
end; $$;
revoke all on function private.consume_login_bucket(text,integer) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.consume_login_bucket(text,integer) to service_role;
create function public.consume_login_attempt(bucket_hash text,max_attempts integer) returns boolean language sql security invoker set search_path='' as $$
 select private.consume_login_bucket(bucket_hash,max_attempts);
$$;
revoke all on function public.consume_login_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.consume_login_attempt(text,integer) to service_role;


-- SOURCE: supabase/seed.sql
-- Reference seed: no users/passwords. Assign active admins manually in clinic project.
insert into public.settings(key,value) values
('popup','{"title":"","text":"","active":false,"startsAt":null,"endsAt":null}'),
('contact','{"whatsapp":"5521985601000","message":"Olá, encontrei o site da Clínica de Olhos Benchimol em uma busca e gostaria de mais informações"}')
on conflict(key) do nothing;
insert into public.reserved_routes(path) values
('/'),
('/admin/'),
('/api/'),
('/blog/'),
('/catarata/'),
('/category/'),
('/certificacoes/'),
('/cirurgia-refrativa/'),
('/convenios/'),
('/degeneracao-macular/'),
('/dr-amir-zisman/'),
('/dr-eduardo-lessa-martinez/'),
('/dr-eliezer-benchimol/'),
('/dr-gabriel-benchimol/'),
('/dr-luciano-galhardo-de-barros/'),
('/dr-paulo-de-heraclito-lima-filho/'),
('/dr-raphael-lima-benchimol/'),
('/dr-sergio-benchimol-old/'),
('/dr-sergio-benchimol/'),
('/dra-adriana-benchimol/'),
('/dra-amelia-gomes-de-souza/'),
('/dra-dilma-de-sa-cavalcanti-do-vale/'),
('/dra-francine-campos-hauck/'),
('/dra-liana-benchimol/'),
('/dra-mirelle-benchimol/'),
('/dra-monica-de-oliveira-coelho/'),
('/dra-nina-benchimol/'),
('/dra-veronica-benchimol/'),
('/equipamentos/'),
('/equipe/'),
('/especialidades/'),
('/exames-e-procedimentos/'),
('/faq-perguntas-frequentes/'),
('/glaucoma/'),
('/instalacoes/'),
('/insternacional/'),
('/olho-seco/'),
('/retinopatia-diabetica/'),
('/robots.txt/'),
('/sample-page/'),
('/servicos/'),
('/sitemap.xml/'),
('/sobre-nos/'),
('/tag/'),
('/wp-admin/'),
('/wp-content/'),
('/wp-json/')
on conflict do nothing;
