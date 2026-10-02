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
