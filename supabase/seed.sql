-- Local development data. Runs after migrations on `supabase db reset`.
-- Three housemates: an admin and a member who share a house, and an outsider
-- with no house. All three sign in by email OTP (read the code in Mailpit).

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Asha Admin"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'member@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Mohan Member"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'outsider@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Olivia Outsider"}', now(), now(),
    '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.houses (id, name, address, created_by)
values (
  '00000000-0000-4000-8000-0000000000b1', 'Seed House', '12 Example Street',
  '00000000-0000-4000-8000-0000000000a1'
)
on conflict (id) do nothing;

insert into public.house_members (house_id, user_id, role, status, joined_at)
values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'admin', 'active', now()),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a2', 'member', 'active', now())
on conflict (house_id, user_id) do nothing;

-- Fixed code so the join flow can be tried without opening the admin account.
insert into public.house_invites (house_id, code, created_by)
values ('00000000-0000-4000-8000-0000000000b1', 'SEED22', '00000000-0000-4000-8000-0000000000a1')
on conflict do nothing;

-- Where the push trigger posts locally (Kong, inside the Docker network) and the shared secret
-- it sends. The secret must match PUSH_FUNCTION_SECRET in supabase/functions/.env.
select vault.create_secret('http://supabase_kong_kinwoo:8000/functions/v1/send-push', 'push_function_url')
 where not exists (select 1 from vault.secrets where name = 'push_function_url');
select vault.create_secret('local-push-secret', 'push_function_secret')
 where not exists (select 1 from vault.secrets where name = 'push_function_secret');
