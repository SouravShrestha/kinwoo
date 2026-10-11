-- One house per user, for now. The limit lives in max_houses_per_user() so lifting it later is a
-- one-line change; create_house and join_house both read it, and invite previews report
-- 'house_limit' so a recipient is told before they tap Join.

create function public.max_houses_per_user() returns int
language sql immutable set search_path = '' as $$
  select 1;
$$;

revoke all on function public.max_houses_per_user() from public, anon, authenticated;

create or replace function public.create_house(
  p_name text, p_emoji text default null, p_address text default null
) returns public.houses
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house public.houses;
  v_n int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  select count(*) into v_n from public.house_members
   where user_id = v_uid and status = 'active';
  if v_n >= public.max_houses_per_user() then raise exception 'HOUSE_LIMIT_REACHED'; end if;

  insert into public.houses (name, emoji, address, created_by)
  values (btrim(p_name), nullif(btrim(p_emoji), ''), nullif(btrim(p_address), ''), v_uid)
  returning * into v_house;

  insert into public.house_members (house_id, user_id, role, status, joined_at)
  values (v_house.id, v_uid, 'admin', 'active', now());

  insert into public.house_invites (house_id, code, created_by, expires_at)
  values (v_house.id, public.generate_invite_code(), v_uid, now() + interval '7 days');

  perform public.log_activity(v_house.id, v_uid, 'house_created', 'house', v_house.id,
                              jsonb_build_object('name', v_house.name));

  return v_house;
end $$;

-- status: valid | already_member | invalid | revoked | expired | exhausted | full | house_limit
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
  elsif v_inv.revoked_at is not null then v_status := 'revoked';
  elsif v_inv.expires_at <= now() then v_status := 'expired';
  elsif v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then v_status := 'exhausted';
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

  select display_name into v_inviter from public.profiles where id = v_inv.created_by;

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
    'emoji', v_house.emoji,
    'member_count', v_count,
    'members', v_members,
    'invited_by', v_inviter,
    'requires_approval', v_house.require_approval
  );
end $$;

-- status: joined | pending | already_member | invalid | revoked | expired | exhausted | full | house_limit
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

  if v_inv.revoked_at is not null then return jsonb_build_object('status', 'revoked'); end if;
  if v_inv.expires_at <= now() then return jsonb_build_object('status', 'expired'); end if;
  if v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then
    return jsonb_build_object('status', 'exhausted');
  end if;

  select count(*) into v_count from public.house_members
   where house_id = v_house.id and status = 'active';
  if v_count >= v_house.member_limit then return jsonb_build_object('status', 'full'); end if;

  select count(*) into v_count from public.house_members
   where user_id = v_uid and status = 'active';
  if v_count >= public.max_houses_per_user() then
    return jsonb_build_object('status', 'house_limit');
  end if;

  v_status := case when v_house.require_approval then 'pending' else 'active' end;

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

  update public.house_invites set uses = uses + 1 where id = v_inv.id;

  perform public.log_activity(
    v_house.id, v_uid,
    case when v_status = 'active' then 'member_joined' else 'join_requested' end,
    'member', v_uid, jsonb_build_object('invite_id', v_inv.id));

  return jsonb_build_object(
    'status', case when v_status = 'active' then 'joined' else 'pending' end,
    'house_id', v_house.id);
end $$;
