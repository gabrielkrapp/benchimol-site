-- SEC-01: explicit application grants replace Supabase's inherited broad grants.
-- Idempotent and data-preserving. Apply as postgres after the four base schemas.
-- Existing provider-owned auth/storage schemas and their grants are untouched.
revoke all privileges on table public.administrators,public.posts,public.post_revisions,
 public.redirects,public.taxonomies,public.media,public.media_uploads,public.settings,
 public.settings_revisions,public.reserved_routes,public.operation_events
 from public,anon,authenticated,service_role;
revoke all privileges on table private.login_windows from public,anon,authenticated,service_role;

grant select on public.posts,public.redirects,public.taxonomies,public.settings,public.reserved_routes to anon;
grant select on public.administrators,public.posts,public.post_revisions,public.redirects,
 public.taxonomies,public.media,public.media_uploads,public.settings,public.settings_revisions,
 public.reserved_routes,public.operation_events to authenticated;
grant insert(slug,legacy_path,public_path,title,excerpt_html,body_html,author_name,featured_image,featured_alt,category_ids,tag_ids,seo,published_at,updated_by) on public.posts to authenticated;
grant update(slug,public_path,title,excerpt_html,body_html,author_name,status,featured_image,featured_alt,category_ids,tag_ids,seo,published_at,version,publication_sync) on public.posts to authenticated;
grant insert(from_path,to_path,post_id),update(to_path) on public.redirects to authenticated;
grant insert(id,url,storage_path,mime_type,bytes,width,height,alt,caption),update(alt,caption),delete on public.media to authenticated;
grant insert(id,user_id,storage_path,mime_type,bytes,alt,caption),delete on public.media_uploads to authenticated;
grant update(value,version,updated_at,updated_by) on public.settings to authenticated;

-- Reassert the callable application surface; trigger execution needs no client EXECUTE.
revoke all privileges on function public.create_post(jsonb),public.save_post(uuid,integer,jsonb),
 public.restore_post(uuid,integer,uuid),public.save_settings(text,integer,jsonb),
 public.restore_contact_settings(integer,uuid),public.get_public_media(uuid),
 public.consume_login_attempt(text,integer) from public,anon,authenticated,service_role;
grant execute on function public.create_post(jsonb),public.save_post(uuid,integer,jsonb),
 public.restore_post(uuid,integer,uuid),public.save_settings(text,integer,jsonb),
 public.restore_contact_settings(integer,uuid) to authenticated;
grant execute on function public.get_public_media(uuid) to anon,authenticated;
grant execute on function public.consume_login_attempt(text,integer) to service_role;

revoke all privileges on all functions in schema private from public,anon,authenticated,service_role;
grant execute on function private.is_active_admin(),private.media_url_path(text),private.is_deletable_media_path(text) to authenticated;
grant execute on function private.is_public_media_path(text),private.public_media(uuid) to anon,authenticated;
grant execute on function private.consume_login_bucket(text,integer) to service_role;

-- Only postgres-created future app objects are changed, not provider owner roles.
alter default privileges for role postgres in schema public,private revoke all on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,private revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,private revoke all on functions from anon,authenticated,service_role;
-- PUBLIC EXECUTE is PostgreSQL's global default: a per-schema REVOKE cannot remove it.
alter default privileges for role postgres revoke execute on functions from public;
