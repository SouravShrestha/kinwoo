begin;
select * from no_plan();

create table public.default_privileges_probe (id integer);
create sequence public.default_privileges_probe_seq;
create function public.default_privileges_probe_fn() returns integer
  language sql
  as $$ select 1 $$;

select ok(
  not has_table_privilege('anon', 'public.default_privileges_probe', 'SELECT'),
  'anon cannot read newly-created public tables by default'
);
select ok(
  not has_table_privilege('authenticated', 'public.default_privileges_probe', 'SELECT'),
  'authenticated cannot read newly-created public tables by default'
);
select ok(
  not has_sequence_privilege('anon', 'public.default_privileges_probe_seq', 'USAGE'),
  'anon cannot use newly-created public sequences by default'
);
select ok(
  not has_sequence_privilege('authenticated', 'public.default_privileges_probe_seq', 'USAGE'),
  'authenticated cannot use newly-created public sequences by default'
);
select ok(
  not has_function_privilege('anon', 'public.default_privileges_probe_fn()', 'EXECUTE'),
  'anon cannot execute newly-created public functions by default'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.default_privileges_probe_fn()',
    'EXECUTE'
  ),
  'authenticated cannot execute newly-created public functions by default'
);

select ok(
  not has_sequence_privilege('anon', 'public.invite_attempts_id_seq', 'USAGE'),
  'anon cannot use the invite-attempts sequence'
);
select ok(
  not has_sequence_privilege('authenticated', 'public.invite_attempts_id_seq', 'USAGE'),
  'authenticated cannot use the invite-attempts sequence'
);
select ok(
  not (select public from storage.buckets where id = 'uploaded_avatars'),
  'uploaded avatars bucket is private'
);

select * from finish();
rollback;
