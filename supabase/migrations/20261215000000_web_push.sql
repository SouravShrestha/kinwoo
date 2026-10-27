-- Browser push subscriptions share push_tokens. A web token is the subscription as JSON
-- ({"endpoint":...,"keys":{"p256dh":...,"auth":...}}); the endpoint host must be a browser push
-- service, so send-push can never be pointed at an arbitrary URL.
CREATE FUNCTION public.push_token_platform(p_token text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select case
    when p_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$' then 'android'
    when length(p_token) <= 2000
     and p_token ~ '^\{"endpoint":"https://(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)/[A-Za-z0-9_~%./?=&+:@!$*,;-]+","keys":\{"p256dh":"[A-Za-z0-9_-]+","auth":"[A-Za-z0-9_-]+"\}\}$'
      then 'web'
  end
$$;

REVOKE ALL ON FUNCTION public.push_token_platform(p_token text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.push_token_platform(p_token text) TO service_role;

ALTER TABLE public.push_tokens
    DROP CONSTRAINT push_tokens_platform_valid,
    DROP CONSTRAINT push_tokens_token_format,
    ADD CONSTRAINT push_tokens_token_valid CHECK (public.push_token_platform(token) = platform);

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_platform text := public.push_token_platform(p_token);
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_platform is null then raise exception 'INVALID_INPUT'; end if;
  insert into public.push_tokens (user_id, token, platform, created_at)
  values (v_uid, p_token, v_platform, clock_timestamp())
  on conflict (token) do update set user_id = excluded.user_id, created_at = excluded.created_at;
  delete from public.push_tokens
   where user_id = v_uid
     and id not in (
       select id from public.push_tokens where user_id = v_uid order by created_at desc limit 10
     );
end $$;
