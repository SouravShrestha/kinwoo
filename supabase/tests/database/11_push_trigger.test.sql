begin;
select * from no_plan();

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000d3', 'authenticated', 'authenticated',
        'p@test.local', now(), jsonb_build_object('full_name', 'Pia'));

insert into public.houses (id, name, created_by)
values ('00000000-0000-4000-8000-0000000000d4', 'Push House', '00000000-0000-4000-8000-0000000000d3');

create function pg_temp.queued() returns bigint
language sql as $$ select count(*) from net.http_request_queue $$;

-- Without the function URL and secret nothing is queued, and the write still succeeds.
delete from vault.secrets where name in ('push_function_url', 'push_function_secret');

select lives_ok(
  $$select public.log_activity('00000000-0000-4000-8000-0000000000d4',
      '00000000-0000-4000-8000-0000000000d3', 'expense.created')$$,
  'logging succeeds when push is not configured');
select is(pg_temp.queued(), 0::bigint, 'nothing is queued without configuration');

select vault.create_secret('http://example.invalid/send-push', 'push_function_url');
select vault.create_secret('test-secret', 'push_function_secret');

select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'expense.created');
select is(pg_temp.queued(), 1::bigint, 'an expense entry queues one call');

select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'settlement.recorded');
select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'grocery_item.assigned');
select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'join_requested');
select is(pg_temp.queued(), 4::bigint, 'each announced event type queues a call');

select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'expense.deleted');
select public.log_activity('00000000-0000-4000-8000-0000000000d4',
  '00000000-0000-4000-8000-0000000000d3', 'member_joined');
select is(pg_temp.queued(), 4::bigint, 'other event types queue nothing');

select is(
  (select convert_from(body, 'utf8')::jsonb ? 'activity_id'
     from net.http_request_queue order by id limit 1),
  true, 'the call carries only the activity id');
select is(
  (select headers ->> 'x-push-secret' from net.http_request_queue order by id limit 1),
  'test-secret', 'the call carries the shared secret');

select * from finish();
rollback;
