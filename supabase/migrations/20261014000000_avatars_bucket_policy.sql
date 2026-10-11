-- The bucket is public, so image URLs need no policy. This one only lets a
-- signed-in user list the preset avatars to choose from. There is no INSERT,
-- UPDATE or DELETE policy: avatars are managed from the dashboard, not by clients.
create policy "Signed-in users can list avatars"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');
