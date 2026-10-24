begin;
select * from no_plan();

create schema tests;
grant usage on schema tests to public;

create function tests.as_user(p_id uuid) returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Sign-up metadata is user-controlled
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated',
        'evil@test.local', now(),
        jsonb_build_object('full_name', E'Eve‮lin', 'avatar_url', 'https://evil.test/p.png')),
       ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated',
        'good@test.local', now(),
        jsonb_build_object('full_name', 'Gita',
                           'avatar_url', 'https://lh3.googleusercontent.com/a/photo'));

select is((select display_name from public.profiles
            where id = '00000000-0000-4000-8000-0000000000e1'),
  'Evelin', 'sign-up strips bidi overrides from the name');
select is((select avatar_url from public.profiles
            where id = '00000000-0000-4000-8000-0000000000e1'),
  null, 'sign-up drops a non-Google avatar');
select is((select avatar_url from public.profiles
            where id = '00000000-0000-4000-8000-0000000000e2'),
  null, 'sign-up leaves a Google avatar out so the API can assign a random preset');

insert into storage.objects (bucket_id, name) values
  ('avatars', 'avatar-01.png'),
  ('uploaded_avatars', '00000000-0000-4000-8000-0000000000e1/3f2b8c1e-0000-4000-8000-000000000001.jpg'),
  ('uploaded_avatars', '00000000-0000-4000-8000-0000000000e2/3f2b8c1e-0000-4000-8000-000000000002.jpg');

-- Direct writes with the user's own token
select tests.as_user('00000000-0000-4000-8000-0000000000e1');

select throws_ok(
  $$update public.profiles set avatar_url = 'https://evil.test/pixel.png'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', 'INVALID_AVATAR', 'an arbitrary avatar URL is rejected');
select throws_ok(
  $$update public.profiles set avatar_url = 'https://lh3.googleusercontent.com/a/photo'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', 'INVALID_AVATAR', 'a Google photo URL is rejected');
select throws_ok(
  $$update public.profiles set avatar_url = 'avatar-99.png'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', 'INVALID_AVATAR', 'a path that is not a preset is rejected');
select lives_ok(
  $$update public.profiles set avatar_url = 'avatar-01.png'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  'a preset avatar is accepted');
select lives_ok(
  $$update public.profiles
       set avatar_url = '00000000-0000-4000-8000-0000000000e1/3f2b8c1e-0000-4000-8000-000000000001.jpg'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  'an avatar the user uploaded is accepted');
select throws_ok(
  $$update public.profiles
       set avatar_url = '00000000-0000-4000-8000-0000000000e2/3f2b8c1e-0000-4000-8000-000000000002.jpg'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', 'INVALID_AVATAR', 'an upload that belongs to someone else is rejected');
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('uploaded_avatars', '00000000-0000-4000-8000-0000000000e1/3f2b8c1e-0000-4000-8000-000000000003.jpg')$$,
  'a user can upload into their own folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('uploaded_avatars', '00000000-0000-4000-8000-0000000000e2/3f2b8c1e-0000-4000-8000-000000000004.jpg')$$,
  '42501', null, 'a user cannot upload into another folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatars', 'avatar-99.png')$$,
  '42501', null, 'a user cannot add a preset-style file');
select lives_ok(
  $$update public.profiles set avatar_url = null
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  'clearing the avatar is accepted');
select throws_ok(
  $$update public.profiles set display_name = E'Bad\u0007name'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'a control character in the name is rejected');
select throws_ok(
  $$update public.profiles set locale = 'en; drop'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'a malformed locale is rejected');
select lives_ok(
  $$update public.profiles set locale = 'en-IN', display_name = 'Eve'
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  'valid preferences still save');

select lives_ok(
  $$update public.profiles set muted_push_types = array['join_requested', 'expense.created', 'news', 'tips']
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  'known push types can be muted');
select throws_ok(
  $$update public.profiles set muted_push_types = array['expense.deleted']
     where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'an unknown push type is rejected');

select * from finish();
rollback;
