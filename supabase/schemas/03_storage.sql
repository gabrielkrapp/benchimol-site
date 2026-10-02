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
