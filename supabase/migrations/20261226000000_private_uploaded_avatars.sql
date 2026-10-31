-- Uploaded avatars are private objects. Access is granted through signed URLs only,
-- and only for profiles visible to the authenticated caller.
UPDATE storage.buckets
SET public = false
WHERE id = 'uploaded_avatars';

CREATE POLICY "Users read visible uploaded avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'uploaded_avatars'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (storage.foldername(name))[1]::uuid
        AND profiles.avatar_url = storage.objects.name
        AND public.shares_house_with(profiles.id)
    )
  );
