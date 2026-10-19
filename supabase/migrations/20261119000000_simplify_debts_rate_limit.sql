-- Each real change writes an activity row and wakes every member's realtime channel, so one person
-- cannot flip it more than 6 times in 10 minutes. Only changes are logged, so counting the log
-- counts changes and an unchanged value never uses up the allowance.
create or replace function public.set_simplify_debts(p_house_id uuid, p_enabled boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_current boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;

  -- The row lock serialises concurrent calls, so the count below cannot be raced past.
  select simplify_debts into v_current
    from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_current = p_enabled then return; end if;

  if (select count(*) from public.activity_log
       where house_id = p_house_id and actor_id = v_uid
         and type = 'simplify_debts_changed'
         and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'RATE_LIMITED';
  end if;

  update public.houses set simplify_debts = p_enabled where id = p_house_id;
  perform public.log_activity(p_house_id, v_uid, 'simplify_debts_changed', 'house', p_house_id,
                              jsonb_build_object('enabled', p_enabled));
end $$;
