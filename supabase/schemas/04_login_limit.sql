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
