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

create function tests.inbox_count() returns bigint
language sql security definer as $$
  select count(*) from public.notifications where id::text like '00000000-0000-4000-8000-0000000000b%'
$$;

create function tests.unread_count() returns bigint
language sql security definer as $$
  select count(*) from public.notifications
  where read_at is null and id::text like '00000000-0000-4000-8000-0000000000b%'
$$;

grant execute on all functions in schema tests to public;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated',
        'a@test.local', now(), jsonb_build_object('full_name', 'Asha')),
       ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated',
        'b@test.local', now(), jsonb_build_object('full_name', 'Rohan'));

insert into public.houses (id, name, created_by)
values ('00000000-0000-4000-8000-0000000000f1', 'Home', '00000000-0000-4000-8000-0000000000e1');
insert into public.activity_log (id, house_id, actor_id, type)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000f1',
        '00000000-0000-4000-8000-0000000000e1', 'settlement.recorded'),
       ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000f1',
        '00000000-0000-4000-8000-0000000000e1', 'settlement.recorded');
insert into public.notifications (id, user_id, activity_id)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000e1',
        '00000000-0000-4000-8000-0000000000a1'),
       ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000e1',
        '00000000-0000-4000-8000-0000000000a2'),
       ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000e2',
        '00000000-0000-4000-8000-0000000000a1');

select tests.as_user('00000000-0000-4000-8000-0000000000e1');

select is((select count(*) from public.notifications), 2::bigint,
  'a user reads only their own notifications');
select throws_ok(
  $$insert into public.notifications (user_id, activity_id)
    values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'clients cannot write the table directly');
select throws_ok($$delete from public.notifications$$,
  '42501', null, 'clients cannot delete rows directly');

select public.mark_notification_read('00000000-0000-4000-8000-0000000000b3');
select is(tests.unread_count(), 3::bigint, 'marking someone else''s notification does nothing');

select public.mark_notification_read('00000000-0000-4000-8000-0000000000b1');
select is(tests.unread_count(), 2::bigint, 'marking one read leaves the others unread');
select is(tests.inbox_count(), 3::bigint, 'marking read keeps the notification');

select public.mark_notifications_read();
select is(tests.unread_count(), 1::bigint, 'marking all read touches only the caller''s notifications');
select is(tests.inbox_count(), 3::bigint, 'marking all read keeps every notification');

select tests.as_user('00000000-0000-4000-8000-0000000000e2');
select is((select count(*) from public.notifications), 1::bigint, 'the other user keeps theirs');

select set_config('role', 'anon', true);
select throws_ok($$select public.mark_notifications_read()$$,
  '42501', null, 'anon cannot mark notifications read');

select * from finish();
rollback;
