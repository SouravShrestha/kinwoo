-- Avatars are a preset or the caller's own upload. External URLs, including Google photos, are no
-- longer accepted.
CREATE OR REPLACE FUNCTION public.is_allowed_avatar(p_value text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p_value is null
      or (p_value not like '%/%'
          and exists (select 1 from storage.objects o
                       where o.bucket_id = 'avatars' and o.name = p_value))
      or (p_value like (select auth.uid())::text || '/%'
          and exists (select 1 from storage.objects o
                       where o.bucket_id = 'uploaded_avatars' and o.name = p_value));
$$;
