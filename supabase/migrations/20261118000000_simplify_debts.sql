-- Not in the houses column grant, so clients can only change it through set_simplify_debts, which
-- every member may call and which always leaves an activity entry.
alter table public.houses add column simplify_debts boolean not null default false;

create function public.set_simplify_debts(p_house_id uuid, p_enabled boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_current boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;

  select simplify_debts into v_current
    from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_current = p_enabled then return; end if;

  update public.houses set simplify_debts = p_enabled where id = p_house_id;
  perform public.log_activity(p_house_id, v_uid, 'simplify_debts_changed', 'house', p_house_id,
                              jsonb_build_object('enabled', p_enabled));
end $$;

revoke all on function public.set_simplify_debts(uuid, boolean) from public, anon;
grant execute on function public.set_simplify_debts(uuid, boolean) to authenticated;
