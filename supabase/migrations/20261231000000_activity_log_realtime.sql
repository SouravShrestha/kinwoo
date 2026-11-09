-- Every expense and settlement write (including soft deletes, which RLS would hide on the row
-- itself) logs an activity entry, so clients listen here to refresh money screens live.
-- RLS still limits delivery to members of the house.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.activity_log;
  end if;
end $$;
