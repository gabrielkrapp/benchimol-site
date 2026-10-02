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
