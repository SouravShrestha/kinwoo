begin;
select * from no_plan();

create schema tests;
grant usage on schema tests to public;

create function tests.create_user(p_id uuid, p_email text) returns void
language sql as $$
  insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (p_id, 'authenticated', 'authenticated', p_email, now(),
          jsonb_build_object('full_name', p_email));
$$;

create function tests.as_user(p_id uuid) returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.as_superuser() returns void
language plpgsql as $$
begin
  reset role;
end $$;

grant execute on all functions in schema tests to public;

select tests.create_user('00000000-0000-4000-8000-0000000000d1', 'admin@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000d2', 'member@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000d3', 'third@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000d4', 'fourth@test.local');

select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select set_config('tests.house', (public.create_house('Flat', 'Somewhere, Bengaluru')).id::text, true);
select set_config('tests.code',
  (select code from public.house_invites where house_id = current_setting('tests.house')::uuid),
  true);

select is((select count(*) from public.house_members
            where house_id = current_setting('tests.house')::uuid and role = 'admin'),
  1::bigint, 'creator is the admin');
select is((select count(*) from public.house_invites
            where house_id = current_setting('tests.house')::uuid),
  1::bigint, 'create_house makes a first invite');
select is((select join_mode from public.houses where id = current_setting('tests.house')::uuid),
  'invited', 'a new house is private');
update public.houses set join_mode = 'anyone' where id = current_setting('tests.house')::uuid;
select throws_ok($$select public.create_house('   ')$$,
  'P0001', 'INVALID_NAME', 'blank names are rejected');
select throws_ok($$select public.create_house('A', '12 Test Street, Bengaluru')$$,
  'P0001', 'INVALID_NAME', 'a one-character name is rejected');
select throws_ok($$select public.create_house(repeat('a', 41), '12 Test Street, Bengaluru')$$,
  'P0001', 'INVALID_NAME', 'a name over 40 characters is rejected');
select throws_ok($$select public.create_house('Flat')$$,
  'P0001', 'INVALID_ADDRESS', 'the address is required');
select throws_ok($$select public.create_house('Flat', 'Short')$$,
  'P0001', 'INVALID_ADDRESS', 'an address under 10 characters is rejected');
select throws_ok($$select public.create_house('Flat', repeat('a', 121))$$,
  'P0001', 'INVALID_ADDRESS', 'an address over 120 characters is rejected');
select throws_ok(
  format($$update public.houses set address = null where id = %L$$, current_setting('tests.house')),
  'P0001', 'INVALID_ADDRESS', 'the address cannot be cleared afterwards');

-- Preview and join
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select is(public.get_invite_preview('ILO000')->>'status', 'invalid', 'unknown code is invalid');
select is(public.get_invite_preview(lower(current_setting('tests.code')))->>'status', 'valid',
  'preview is case-insensitive');
select is(public.get_invite_preview(current_setting('tests.code'))->>'name', 'Flat',
  'preview reveals the house for a valid code');
select is(public.get_invite_preview(current_setting('tests.code'))->>'address', 'Somewhere, Bengaluru',
  'preview reveals the house address');
select is(public.join_house(lower(current_setting('tests.code')))->>'status', 'joined',
  'join is case-insensitive');
select is(public.join_house(current_setting('tests.code'))->>'status', 'already_member',
  'join is idempotent');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'already_member',
  'preview reports already_member');

select tests.as_superuser();
select is((select uses from public.house_invites where code = current_setting('tests.code')),
  1, 'uses increments only once');

-- Non-admin calls
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  $$select public.set_member_role(current_setting('tests.house')::uuid,
      '00000000-0000-4000-8000-0000000000d2', 'admin')$$,
  'P0001', 'FORBIDDEN', 'member cannot change roles');
select throws_ok(
  $$select public.remove_member(current_setting('tests.house')::uuid,
      '00000000-0000-4000-8000-0000000000d1')$$,
  'P0001', 'FORBIDDEN', 'member cannot remove members');

-- Admin rules
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select throws_ok(
  $$select public.set_member_role(current_setting('tests.house')::uuid,
      '00000000-0000-4000-8000-0000000000d1', 'member')$$,
  'P0001', 'LAST_ADMIN', 'last admin cannot be demoted');
select throws_ok($$select public.leave_house(current_setting('tests.house')::uuid)$$,
  'P0001', 'LAST_ADMIN', 'last admin cannot leave while others remain');
select throws_ok(
  $$select public.remove_member(current_setting('tests.house')::uuid,
      '00000000-0000-4000-8000-0000000000d1')$$,
  'P0001', 'USE_LEAVE_HOUSE', 'admins use leave_house for themselves');
select throws_ok(
  $$select public.set_member_role(current_setting('tests.house')::uuid,
      '00000000-0000-4000-8000-0000000000d3', 'admin')$$,
  'P0001', 'NOT_A_MEMBER', 'only active members can be promoted');

-- One fixed code per house
select tests.as_superuser();
select throws_ok(
  $$insert into public.house_invites (house_id, code, created_by)
    values (current_setting('tests.house')::uuid, 'ZZZZZZ', '00000000-0000-4000-8000-0000000000d1')$$,
  '23505', null, 'a house cannot have a second code');
select hasnt_function('public', 'create_invite', 'codes cannot be regenerated');
select hasnt_function('public', 'revoke_invite', 'codes cannot be revoked');

select tests.as_user('00000000-0000-4000-8000-0000000000d3');
select is(public.join_house(current_setting('tests.code'))->>'status', 'joined',
  'the same code keeps letting new members in');

-- Only emails you invite
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
update public.houses set join_mode = 'invited' where id = current_setting('tests.house')::uuid;
select tests.as_superuser();
select is((select join_mode from public.houses where id = current_setting('tests.house')::uuid),
  'anyone', 'a member cannot change who can join');

select tests.as_user('00000000-0000-4000-8000-0000000000d1');
update public.houses set join_mode = 'invited' where id = current_setting('tests.house')::uuid;
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'not_invited',
  'invite-only applies to an existing code straight away');
select is(public.join_house(current_setting('tests.code'))->>'status', 'not_invited',
  'an uninvited email cannot join');

select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  $$select public.add_invited_email(current_setting('tests.house')::uuid, 'fourth@test.local')$$,
  'P0001', 'FORBIDDEN', 'member cannot invite emails');

select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select throws_ok(
  $$select public.add_invited_email(current_setting('tests.house')::uuid, 'not-an-email')$$,
  'P0001', 'INVALID_EMAIL', 'malformed emails are rejected');
select is((public.add_invited_email(current_setting('tests.house')::uuid,
                                    '  Fourth@Test.LOCAL ')).email,
  'fourth@test.local', 'invited emails are normalised');
select is((select count(*) from public.house_invited_emails), 1::bigint,
  'admins can read the invited emails');
select public.add_invited_email(current_setting('tests.house')::uuid, 'fourth@test.local');
select is((select count(*) from public.house_invited_emails), 1::bigint,
  'adding the same email again is a no-op');

select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select is((select count(*) from public.house_invited_emails), 0::bigint,
  'members cannot read the invited emails');

select tests.as_superuser();
update auth.users set email_confirmed_at = null where id = '00000000-0000-4000-8000-0000000000d4';
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'not_invited',
  'an unconfirmed email does not count as invited');
select tests.as_superuser();
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-8000-0000000000d4';
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'valid',
  'an invited email can use the code');

select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  $$select public.remove_invited_email((select id from public.house_invited_emails limit 1))$$,
  'P0001', 'FORBIDDEN', 'member cannot remove invited emails');
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.remove_invited_email((select id from public.house_invited_emails limit 1));
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'not_invited',
  'removing the email takes the access away');

select tests.as_user('00000000-0000-4000-8000-0000000000d1');
update public.houses set join_mode = 'anyone' where id = current_setting('tests.house')::uuid;

-- Full
select tests.as_superuser();
update public.houses set member_limit = 3 where id = current_setting('tests.house')::uuid;
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select is(public.join_house(current_setting('tests.code'))->>'status', 'full',
  'a full house returns full');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'full',
  'preview reports full');

-- Remove and rejoin resets the role
select tests.as_superuser();
update public.houses set member_limit = 15 where id = current_setting('tests.house')::uuid;
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.set_member_role(current_setting('tests.house')::uuid,
  '00000000-0000-4000-8000-0000000000d2', 'admin');
select public.remove_member(current_setting('tests.house')::uuid,
  '00000000-0000-4000-8000-0000000000d2');
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select is(public.join_house(current_setting('tests.code'))->>'status', 'pending',
  'a removed member who uses the code waits for an admin');
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.resolve_join_request(current_setting('tests.house')::uuid,
  '00000000-0000-4000-8000-0000000000d2', true);
select is((select status::text from public.house_members
            where house_id = current_setting('tests.house')::uuid
              and user_id = '00000000-0000-4000-8000-0000000000d2'),
  'active', 'an admin approves the removed member back in');
select is((select role::text from public.house_members
            where house_id = current_setting('tests.house')::uuid
              and user_id = '00000000-0000-4000-8000-0000000000d2'),
  'member', 'rejoining resets the role to member');

-- Joining uses up the invitation
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.remove_member(current_setting('tests.house')::uuid,
  '00000000-0000-4000-8000-0000000000d3');
update public.houses set join_mode = 'invited' where id = current_setting('tests.house')::uuid;
select public.add_invited_email(current_setting('tests.house')::uuid, 'third@test.local');
select tests.as_user('00000000-0000-4000-8000-0000000000d3');
select is(public.join_house(current_setting('tests.code'))->>'status', 'joined',
  'an invited email joins a restricted house');
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select is((select count(*) from public.house_invited_emails), 0::bigint,
  'the joined person leaves the pending list');
update public.houses set join_mode = 'anyone' where id = current_setting('tests.house')::uuid;

-- Rotating the invite code
select tests.as_user('00000000-0000-4000-8000-0000000000d2');
select throws_ok(
  format('select public.rotate_invite_code(%L)', current_setting('tests.house')),
  'P0001', 'FORBIDDEN', 'a plain member cannot rotate the code');
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select set_config('tests.old_code', current_setting('tests.code'), true);
select set_config('tests.code', public.rotate_invite_code(current_setting('tests.house')::uuid),
  true);
select isnt(current_setting('tests.code'), current_setting('tests.old_code'),
  'rotation issues a new code');
select is(public.get_invite_preview(current_setting('tests.old_code'))->>'status', 'invalid',
  'the old code stops working');
select is(public.get_invite_preview(current_setting('tests.code'))->>'status', 'already_member',
  'the new code points at the same house');

-- Last admin can leave once another admin exists
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select public.set_member_role(current_setting('tests.house')::uuid,
  '00000000-0000-4000-8000-0000000000d2', 'admin');
select public.leave_house(current_setting('tests.house')::uuid);
select tests.as_user('00000000-0000-4000-8000-0000000000d1');
select is((select count(*) from public.houses), 0::bigint, 'a leaving member loses the house');

-- Sole member leaving soft-deletes
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select set_config('tests.solo', (public.create_house('Solo', '12 Test Street, Bengaluru')).id::text, true);
select public.leave_house(current_setting('tests.solo')::uuid);
select tests.as_superuser();
select isnt((select deleted_at from public.houses where id = current_setting('tests.solo')::uuid),
  null::timestamptz, 'sole member leaving soft-deletes the house');
select is((select status::text from public.house_members
            where house_id = current_setting('tests.solo')::uuid),
  'left', 'the membership is kept as left');

-- Three houses per user
select tests.as_user('00000000-0000-4000-8000-0000000000d3');
select lives_ok($$select public.create_house('Second', '12 Test Street, Bengaluru')$$, 'a second house is allowed');
select lives_ok($$select public.create_house('Third', '12 Test Street, Bengaluru')$$, 'a third house is allowed');
select throws_ok($$select public.create_house('Fourth', '12 Test Street, Bengaluru')$$,
  'P0001', 'HOUSE_LIMIT_REACHED', 'a user in three houses cannot create another');

select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select set_config('tests.other', (public.create_house('Other', '12 Test Street, Bengaluru')).id::text, true);
update public.houses set join_mode = 'anyone' where id = current_setting('tests.other')::uuid;
select set_config('tests.other_code',
  (select code from public.house_invites where house_id = current_setting('tests.other')::uuid),
  true);

select tests.as_user('00000000-0000-4000-8000-0000000000d3');
select is(public.get_invite_preview(current_setting('tests.other_code'))->>'status',
  'house_limit', 'preview warns a user who is in three houses');
select is(public.join_house(current_setting('tests.other_code'))->>'status',
  'house_limit', 'a user in three houses cannot join another');
select is((select count(*) from public.houses), 3::bigint, 'the user is still in three houses');

-- A request made before reaching the limit cannot be approved after it
select tests.as_superuser();
insert into public.house_members (house_id, user_id, role, status)
values (current_setting('tests.other')::uuid, '00000000-0000-4000-8000-0000000000d3',
        'member', 'pending');

select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select throws_ok(
  format($$select public.resolve_join_request(%L, %L, true)$$,
         current_setting('tests.other'), '00000000-0000-4000-8000-0000000000d3'),
  'P0001', 'HOUSE_LIMIT_REACHED', 'approval is refused for someone in three houses');

select tests.as_superuser();
select is((select status::text from public.house_members
            where house_id = current_setting('tests.other')::uuid
              and user_id = '00000000-0000-4000-8000-0000000000d3'),
  'pending', 'the refused request stays pending');

-- Rate limit
select tests.as_superuser();
insert into public.invite_attempts (user_id)
select '00000000-0000-4000-8000-0000000000d4' from generate_series(1, 30);
select tests.as_user('00000000-0000-4000-8000-0000000000d4');
select throws_ok($$select public.get_invite_preview('ILO000')$$,
  'P0001', 'RATE_LIMITED', 'code guessing is rate limited');

select * from finish();
rollback;
