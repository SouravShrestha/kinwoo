-- Each house has exactly one invite code for its whole life. It never expires and cannot be
-- regenerated or revoked; houses.join_mode and the invited-email list decide who may use it.

-- Keep one code per house, preferring the newest one that was still live.
delete from public.house_invites i
 using (select id,
               row_number() over (partition by house_id
                                  order by (revoked_at is null and expires_at > now()) desc,
                                           created_at desc) as rn
          from public.house_invites) ranked
 where i.id = ranked.id and ranked.rn > 1;

drop index if exists public.house_invites_house_idx;
alter table public.house_invites drop column expires_at, drop column revoked_at;
alter table public.house_invites add constraint house_invites_house_id_key unique (house_id);

insert into public.house_invites (house_id, code, created_by)
select h.id, public.generate_invite_code(), h.created_by
  from public.houses h
 where not exists (select 1 from public.house_invites i where i.house_id = h.id);

drop function public.create_invite(uuid, boolean);
drop function public.revoke_invite(uuid);

create or replace function public.create_house(
  p_name text, p_address text default null
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

  insert into public.houses (name, address, created_by)
  values (btrim(p_name), nullif(btrim(p_address), ''), v_uid)
  returning * into v_house;

  insert into public.house_members (house_id, user_id, role, status, joined_at)
  values (v_house.id, v_uid, 'admin', 'active', now());

  insert into public.house_invites (house_id, code, created_by)
  values (v_house.id, public.generate_invite_code(), v_uid);

  perform public.log_activity(v_house.id, v_uid, 'house_created', 'house', v_house.id,
                              jsonb_build_object('name', v_house.name));

  return v_house;
end $$;

-- status: valid | already_member | invalid | not_invited | full | house_limit
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
    'member_count', v_count,
    'members', v_members,
    'invited_by', v_inviter,
    'requires_approval', v_house.require_approval
  );
end $$;

-- status: joined | pending | already_member | invalid | not_invited | full | house_limit
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
