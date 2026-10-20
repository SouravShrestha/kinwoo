-- Removing a member used to be undone by the member themselves: the house's one invite code never
-- changed, and join_house reactivated a removed row straight away. Now a removed member who comes
-- back always waits for an admin, whatever require_approval says, and admins can rotate the code so
-- a leaked link stops working. Someone who left on their own still rejoins as before.

create or replace function public.join_house(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_inv public.house_invites;
  v_house public.houses;
  v_member public.house_members;
  v_count int;
  v_status public.member_status;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform public.check_invite_rate_limit();

  select * into v_inv from public.house_invites where code = v_code for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- Lock the house row so concurrent joins cannot exceed member_limit.
  select * into v_house from public.houses
   where id = v_inv.house_id and deleted_at is null for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select * into v_member from public.house_members
   where house_id = v_house.id and user_id = v_uid;

  if found and v_member.status = 'active' then
    return jsonb_build_object('status', 'already_member', 'house_id', v_house.id);
  elsif found and v_member.status = 'pending' then
    return jsonb_build_object('status', 'pending', 'house_id', v_house.id);
  end if;

  if v_house.join_mode = 'invited' and not public.is_invited_to_house(v_house.id, v_uid) then
    return jsonb_build_object('status', 'not_invited');
  end if;

  select count(*) into v_count from public.house_members
   where house_id = v_house.id and status = 'active';
  if v_count >= v_house.member_limit then return jsonb_build_object('status', 'full'); end if;

  select count(*) into v_count from public.house_members
   where user_id = v_uid and status = 'active';
  if v_count >= public.max_houses_per_user() then
    return jsonb_build_object('status', 'house_limit');
  end if;

  -- An admin removed or turned this person away, so only an admin brings them back: either by
  -- approving the request or by inviting their email again.
  v_status := case
    when v_house.require_approval then 'pending'
    when v_member.status in ('removed', 'rejected')
         and not public.is_invited_to_house(v_house.id, v_uid) then 'pending'
    else 'active'
  end;

  -- Re-joining after leave/removal reactivates the old row as a plain member.
  insert into public.house_members (house_id, user_id, role, status, invited_by, joined_at)
  values (v_house.id, v_uid, 'member', v_status, v_inv.created_by,
          case when v_status = 'active' then now() end)
  on conflict (house_id, user_id) do update
     set status = excluded.status,
         role = 'member',
         invited_by = excluded.invited_by,
         joined_at = excluded.joined_at,
         left_at = null,
         removed_by = null;

  -- The invitation is used up: the person now shows as a member, not a pending email. Someone who
  -- is removed or leaves a restricted house has to be invited again.
  delete from public.house_invited_emails e
   using auth.users u
   where u.id = v_uid and e.house_id = v_house.id and e.email = lower(u.email);

  update public.house_invites set uses = uses + 1 where id = v_inv.id;

  perform public.log_activity(
    v_house.id, v_uid,
    case when v_status = 'active' then 'member_joined' else 'join_requested' end,
    'member', v_uid, jsonb_build_object('invite_id', v_inv.id));

  return jsonb_build_object(
    'status', case when v_status = 'active' then 'joined' else 'pending' end,
    'house_id', v_house.id);
end $$;

-- Admins swap the house's code for a fresh one; the old link then reads as invalid.
create function public.rotate_invite_code(p_house_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.house_invites;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  update public.house_invites
     set code = public.generate_invite_code(), uses = 0, created_by = v_uid, created_at = now()
   where house_id = p_house_id
  returning * into v_invite;
  if not found then raise exception 'NOT_FOUND'; end if;

  perform public.log_activity(
    p_house_id, v_uid, 'invite_created', 'invite', v_invite.id,
    jsonb_build_object('regenerated', true));

  return v_invite.code;
end $$;

revoke all on function public.rotate_invite_code(uuid) from public, anon;
grant execute on function public.rotate_invite_code(uuid) to authenticated;
