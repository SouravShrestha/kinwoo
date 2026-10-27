-- Members upload their own avatar to the public uploaded_avatars bucket, kept apart from the
-- curated presets in the avatars bucket. A file sits in the owner's folder under an unguessable
-- name, so only housemates who are shown the URL can see it. Presets are flat names (no slash);
-- anything in a folder is an upload and must belong to the caller.
CREATE OR REPLACE FUNCTION public.is_allowed_avatar(p_value text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p_value is null
      or p_value like 'https://lh3.googleusercontent.com/%'
      or (p_value not like '%/%'
          and exists (select 1 from storage.objects o
                       where o.bucket_id = 'avatars' and o.name = p_value))
      or (p_value like (select auth.uid())::text || '/%'
          and exists (select 1 from storage.objects o
                       where o.bucket_id = 'uploaded_avatars' and o.name = p_value));
$$;

create policy "Users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploaded_avatars'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
  );

-- Listing is how the client finds the older files to prune.
create policy "Users list their own avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'uploaded_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploaded_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
