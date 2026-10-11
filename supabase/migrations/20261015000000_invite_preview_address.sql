-- The join confirmation sheet shows where the house is and who invited the visitor, so the
-- preview now includes the address and the inviter's avatar.

create or replace function public.get_invite_preview(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_inv public.house_invites;
  v_house public.houses;
  v_count int;
  v_status text;
  v_inviter text;
  v_inviter_avatar text;
  v_members jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform public.check_invite_rate_limit();

  select * into v_inv from public.house_invites where code = v_code;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select * into v_house from public.houses
   where id = v_inv.house_id and deleted_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select count(*) into v_count from public.house_members
   where house_id = v_house.id and status = 'active';

  if exists (select 1 from public.house_members
              where house_id = v_house.id and user_id = v_uid and status = 'active') then
    v_status := 'already_member';
  elsif v_house.join_mode = 'invited' and not public.is_invited_to_house(v_house.id, v_uid) then
    v_status := 'not_invited';
  elsif v_count >= v_house.member_limit then v_status := 'full';
  elsif (select count(*) from public.house_members
          where user_id = v_uid and status = 'active') >= public.max_houses_per_user() then
    v_status := 'house_limit';
  else v_status := 'valid';
  end if;

  -- Only reveal house details when the invite is usable.
  if v_status not in ('valid', 'already_member') then
    return jsonb_build_object('status', v_status);
  end if;

  select display_name, avatar_url into v_inviter, v_inviter_avatar
    from public.profiles where id = v_inv.created_by;

  select coalesce(jsonb_agg(jsonb_build_object('name', s.display_name, 'avatar_url', s.avatar_url)),
                  '[]'::jsonb)
    into v_members
    from (select p.display_name, p.avatar_url
            from public.house_members m
            join public.profiles p on p.id = m.user_id
           where m.house_id = v_house.id and m.status = 'active'
           order by m.joined_at
           limit 5) s;

  return jsonb_build_object(
    'status', v_status,
    'house_id', v_house.id,
    'name', v_house.name,
    'address', v_house.address,
    'member_count', v_count,
    'members', v_members,
    'invited_by', v_inviter,
    'invited_by_avatar_url', v_inviter_avatar,
    'requires_approval', v_house.require_approval
  );
end $$;
