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

create function tests.token_count(p_token text) returns bigint
language sql security definer as $$
  select count(*) from public.push_tokens where token = p_token
$$;

create function tests.token_owner(p_token text) returns uuid
language sql security definer as $$
  select user_id from public.push_tokens where token = p_token
$$;

create function tests.token_platform(p_token text) returns text
language sql security definer as $$
  select platform from public.push_tokens where token = p_token
$$;
grant execute on all functions in schema tests to public;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated',
        'a@test.local', now(), jsonb_build_object('full_name', 'Asha')),
       ('00000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated',
        'b@test.local', now(), jsonb_build_object('full_name', 'Rohan'));

select tests.as_user('00000000-0000-4000-8000-0000000000d1');

select lives_ok($$select public.register_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]')$$,
  'a valid token registers');
select lives_ok($$select public.register_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]')$$,
  'registering the same token again is fine');
select is(tests.token_count('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'), 1::bigint,
  'a repeated token stays one row');

select throws_ok($$select public.register_push_token('not-a-token')$$,
  'P0001', 'INVALID_INPUT', 'a malformed token is rejected');
select throws_ok($$select public.register_push_token(null)$$,
  'P0001', 'INVALID_INPUT', 'a null token is rejected');

select throws_ok($$select * from public.push_tokens$$,
  '42501', null, 'clients cannot read the token table');
select throws_ok(
  $$insert into public.push_tokens (user_id, token)
    values ('00000000-0000-4000-8000-0000000000d1', 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]')$$,
  '42501', null, 'clients cannot write the token table directly');

-- A phone that changes account takes its token with it.
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select public.register_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]');
select is(tests.token_owner('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'),
  '00000000-0000-4000-8000-0000000000d2'::uuid, 'the token moves to the new account');

-- Asha can no longer remove it: it is no longer hers.
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.unregister_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]');
select is(tests.token_count('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'), 1::bigint,
  'unregistering someone else''s token does nothing');

select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select public.unregister_push_token('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]');
select is(tests.token_count('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'), 0::bigint,
  'the owner removes their token');

-- Only the 10 newest tokens per user are kept.
select public.register_push_token('ExponentPushToken[' || lpad(i::text, 12, '0') || ']')
  from generate_series(1, 12) as i;
select is(tests.token_count('ExponentPushToken[000000000001]'), 0::bigint,
  'the oldest token was dropped past the limit');
select is(tests.token_count('ExponentPushToken[000000000012]'), 1::bigint,
  'the newest token is kept');

-- Browser subscriptions are stored as JSON and only for browser push services.
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select lives_ok(
  $$select public.register_push_token('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}')$$,
  'a browser subscription registers');
select is(
  tests.token_platform('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}'),
  'web', 'a browser subscription is stored as web');
select throws_ok(
  $$select public.register_push_token('{"endpoint":"https://evil.test/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}')$$,
  'P0001', 'INVALID_INPUT', 'an endpoint outside the browser push services is rejected');
select throws_ok(
  $$select public.register_push_token('{"endpoint":"http://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}')$$,
  'P0001', 'INVALID_INPUT', 'a plain http endpoint is rejected');
select throws_ok(
  $$select public.register_push_token('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc"}')$$,
  'P0001', 'INVALID_INPUT', 'a subscription without keys is rejected');
select public.unregister_push_token('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}');
select is(
  tests.token_platform('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"test-p256dh","auth":"test-auth"}}'),
  null, 'the owner removes their browser subscription');
select set_config('role', 'anon', true);
select throws_ok($$select public.register_push_token('ExponentPushToken[cccccccccccccccccccccc]')$$,
  '42501', null, 'anon cannot call register_push_token');

select * from finish();
rollback;
