-- Preset avatars are stored as bucket paths ('avatar-01.png') instead of full public URLs, so a
-- change of Supabase host no longer breaks them. The API resolves paths to URLs when reading.
update public.profiles
   set avatar_url = regexp_replace(avatar_url, '^https?://[^/]+/storage/v1/object/public/avatars/', '')
 where avatar_url ~ '^https?://[^/]+/storage/v1/object/public/avatars/';
