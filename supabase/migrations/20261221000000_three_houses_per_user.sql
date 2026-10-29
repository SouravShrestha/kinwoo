CREATE OR REPLACE FUNCTION public.max_houses_per_user() RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select 3;
$$;

-- join_house counts active houses only, so a person can wait in several houses at once. Approval
-- is where the limit has to hold.
CREATE OR REPLACE FUNCTION public.resolve_join_request(p_house_id uuid, p_user_id uuid, p_approve boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_house public.houses; v_target public.house_members; v_count int;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  select * into v_house from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'NO_PENDING_REQUEST'; end if;

  if p_approve then
    select count(*) into v_count from public.house_members
     where house_id = p_house_id and status = 'active';
    if v_count >= v_house.member_limit then raise exception 'HOUSE_FULL'; end if;

    select count(*) into v_count from public.house_members
     where user_id = p_user_id and status = 'active';
    if v_count >= public.max_houses_per_user() then raise exception 'HOUSE_LIMIT_REACHED'; end if;

    update public.house_members set status = 'active', joined_at = now() where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'member_joined', 'member', p_user_id,
                                jsonb_build_object('approved', true));
  else
    update public.house_members set status = 'rejected' where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'join_rejected', 'member', p_user_id);
  end if;
end $$;
