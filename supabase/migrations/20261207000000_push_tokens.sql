-- Expo push tokens, one row per device. Clients write only through the RPCs below.
CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text DEFAULT 'android'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT push_tokens_token_key UNIQUE (token),
    CONSTRAINT push_tokens_platform_valid CHECK ((platform = 'android'::text)),
    CONSTRAINT push_tokens_token_format CHECK ((token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$'::text)),
    CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX push_tokens_user_idx ON public.push_tokens USING btree (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- New tables are granted to anon and authenticated by default; only the sender reads this one.
REVOKE ALL ON TABLE public.push_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.push_tokens TO service_role;

-- A token already on file moves to the caller, so a shared phone never keeps notifying the
-- previous account. Each user keeps their 10 newest tokens.
CREATE FUNCTION public.register_push_token(p_token text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$' then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.push_tokens (user_id, token, created_at)
  values (v_uid, p_token, clock_timestamp())
  on conflict (token) do update set user_id = excluded.user_id, created_at = excluded.created_at;

  delete from public.push_tokens
   where user_id = v_uid
     and id not in (
       select id from public.push_tokens where user_id = v_uid order by created_at desc limit 10
     );
end $$;

CREATE FUNCTION public.unregister_push_token(p_token text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  delete from public.push_tokens where token = p_token and user_id = v_uid;
end $$;

REVOKE ALL ON FUNCTION public.register_push_token(p_token text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.register_push_token(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.register_push_token(p_token text) TO service_role;

REVOKE ALL ON FUNCTION public.unregister_push_token(p_token text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.unregister_push_token(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.unregister_push_token(p_token text) TO service_role;
