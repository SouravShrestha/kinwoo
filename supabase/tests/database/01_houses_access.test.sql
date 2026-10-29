begin;
select * from no_plan();

create schema tests;
grant usage on schema tests to public;

create function tests.create_user(p_id uuid, p_email text) returns void
language sql as $$
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values (p_id, 'authenticated', 'authenticated', p_email,
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

create function tests.affected_rows(p_sql text) returns bigint
language plpgsql as $$
declare v_n bigint;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create function tests.as_nobody() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.as_anon() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

select tests.create_user('00000000-0000-4000-8000-0000000000c1', 'admin-a@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000c2', 'member-a@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000c3', 'outsider@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000c4', 'admin-b@test.local');

select tests.as_user('00000000-0000-4000-8000-0000000000c1');
select set_config('tests.house_a', (public.create_house('House A', '12 Test Street, Bengaluru')).id::text, true);
update public.houses set join_mode = 'anyone' where id = current_setting('tests.house_a')::uuid;
select set_config('tests.code_a',
  (select code from public.house_invites where house_id = current_setting('tests.house_a')::uuid),
  true);

select tests.as_user('00000000-0000-4000-8000-0000000000c2');
select is(public.join_house(current_setting('tests.code_a'))->>'status', 'joined',
  'member joins house A');

select tests.as_user('00000000-0000-4000-8000-0000000000c4');
select set_config('tests.house_b', (public.create_house('House B', '12 Test Street, Bengaluru')).id::text, true);

-- Outsider with no house
select tests.as_user('00000000-0000-4000-8000-0000000000c3');
select is((select count(*) from public.houses), 0::bigint, 'outsider sees no houses');
select is((select count(*) from public.house_members), 0::bigint, 'outsider sees no memberships');
select is((select count(*) from public.house_invites), 0::bigint, 'outsider sees no invites');
select is((select count(*) from public.activity_log), 0::bigint, 'outsider sees no activity');
select is((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c1'),
  0::bigint, 'outsider cannot read a stranger profile');
select is((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c3'),
  1::bigint, 'outsider can read their own profile');

-- Member of house B cannot see house A
select tests.as_user('00000000-0000-4000-8000-0000000000c4');
select is((select count(*) from public.houses), 1::bigint, 'admin of B sees only one house');
select is((select count(*) from public.houses where id = current_setting('tests.house_a')::uuid),
  0::bigint, 'admin of B cannot read house A');
select is((select count(*) from public.house_members
            where house_id = current_setting('tests.house_a')::uuid),
  0::bigint, 'admin of B cannot read house A members');
select is((select count(*) from public.house_invites
            where house_id = current_setting('tests.house_a')::uuid),
  0::bigint, 'admin of B cannot read house A invites');

-- Member of house A
select tests.as_user('00000000-0000-4000-8000-0000000000c2');
select is((select count(*) from public.houses), 1::bigint, 'member sees their house');
select is((select count(*) from public.house_members
            where house_id = current_setting('tests.house_a')::uuid),
  2::bigint, 'member sees both members');
select is((select count(*) from public.house_invites), 0::bigint, 'member cannot read invites');
select ok((select count(*) from public.activity_log) > 0, 'member reads the activity log');
select is((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c1'),
  1::bigint, 'member can read a housemate profile');

select throws_ok(
  $$insert into public.house_members (house_id, user_id)
    values (current_setting('tests.house_a')::uuid, '00000000-0000-4000-8000-0000000000c3')$$,
  '42501', null, 'members cannot insert into house_members');
select throws_ok($$update public.house_members set role = 'admin'$$,
  '42501', null, 'members cannot update house_members');
select throws_ok($$delete from public.house_members$$,
  '42501', null, 'members cannot delete from house_members');
select throws_ok(
  $$insert into public.house_invites (house_id, code, created_by)
    values (current_setting('tests.house_a')::uuid, 'ABCDEF',
            '00000000-0000-4000-8000-0000000000c2')$$,
  '42501', null, 'members cannot insert into house_invites');
select throws_ok($$update public.house_invites set uses = 0$$,
  '42501', null, 'members cannot update house_invites');
select throws_ok($$delete from public.house_invites$$,
  '42501', null, 'members cannot delete from house_invites');
select throws_ok(
  $$insert into public.activity_log (house_id, type)
    values (current_setting('tests.house_a')::uuid, 'forged')$$,
  '42501', null, 'members cannot insert into activity_log');
select throws_ok($$update public.activity_log set type = 'x'$$,
  '42501', null, 'members cannot update activity_log');
select throws_ok($$delete from public.activity_log$$,
  '42501', null, 'members cannot delete from activity_log');
select throws_ok($$select * from public.invite_attempts$$,
  '42501', null, 'members cannot read invite_attempts');

select is(tests.affected_rows($$update public.houses set name = 'Hijacked'$$),
  0::bigint, 'non-admin house update changes no rows');

select tests.as_user('00000000-0000-4000-8000-0000000000c1');
select is(
  tests.affected_rows($$update public.houses set name = 'Renamed'
                         where id = current_setting('tests.house_a')::uuid$$),
  1::bigint, 'admin can rename the house');
select throws_ok($$update public.houses set member_limit = 50$$,
  '42501', null, 'admin cannot change member_limit directly');
select is((select count(*) from public.house_invites), 1::bigint, 'admin reads invites');

select tests.as_anon();
select throws_ok($$select public.create_house('Nope', '12 Test Street, Bengaluru')$$,
  '42501', null, 'anon cannot call create_house');
select throws_ok($$select * from public.houses$$,
  '42501', null, 'anon cannot read houses');

select tests.as_nobody();
select throws_ok($$select public.create_house('Nope', '12 Test Street, Bengaluru')$$,
  'P0001', 'NOT_AUTHENTICATED', 'create_house requires a user');
select throws_ok($$select public.join_house('ABCDEF')$$,
  'P0001', 'NOT_AUTHENTICATED', 'join_house requires a user');
select throws_ok($$select public.get_invite_preview('ABCDEF')$$,
  'P0001', 'NOT_AUTHENTICATED', 'get_invite_preview requires a user');
select throws_ok($$select public.leave_house(gen_random_uuid())$$,
  'P0001', 'NOT_AUTHENTICATED', 'leave_house requires a user');

-- Removal: the user loses the house but still reads their own membership row
select tests.as_user('00000000-0000-4000-8000-0000000000c1');
select public.remove_member(current_setting('tests.house_a')::uuid,
  '00000000-0000-4000-8000-0000000000c2');

select tests.as_user('00000000-0000-4000-8000-0000000000c2');
select is((select count(*) from public.houses), 0::bigint, 'removed user loses the house');
select is((select status::text from public.house_members
            where house_id = current_setting('tests.house_a')::uuid
              and user_id = '00000000-0000-4000-8000-0000000000c2'),
  'removed', 'removed user still reads their own membership row');
select is((select count(*) from public.house_members
            where house_id = current_setting('tests.house_a')::uuid),
  1::bigint, 'removed user sees no other members');

select * from finish();
rollback;
