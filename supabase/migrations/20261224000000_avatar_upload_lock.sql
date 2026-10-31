-- Serialize avatar uploads per user so concurrent requests cannot both pass the
-- five-file limit before either insert becomes visible.
CREATE OR REPLACE FUNCTION public.own_avatar_upload_count() RETURNS integer
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return 0;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('avatar_upload:' || v_uid::text, 0)
  );

  return (
    select count(*)::integer
      from storage.objects o
     where o.bucket_id = 'uploaded_avatars'
       and o.name like v_uid::text || '/%'
  );
end;
$$;

REVOKE ALL ON FUNCTION public.own_avatar_upload_count() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.own_avatar_upload_count() TO authenticated, service_role;
