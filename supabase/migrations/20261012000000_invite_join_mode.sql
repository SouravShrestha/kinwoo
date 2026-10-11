-- Invite codes always last 7 days with unlimited uses. Who may redeem them is a house setting,
-- checked at redemption time so changing it applies to every live code at once.

alter table public.houses
  add column join_mode text not null default 'anyone' check (join_mode in ('anyone', 'invited'));

grant update (join_mode) on public.houses to authenticated;

create table public.house_invited_emails (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  invited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (house_id, email)
);

alter table public.house_invited_emails enable row level security;

grant select on public.house_invited_emails to authenticated;

create policy house_invited_emails_select_admin on public.house_invited_emails
  for select to authenticated
  using (public.is_house_admin(house_id));

-- Only a confirmed address counts, so nobody can claim an invite by signing up with an
-- email they don't control.
create function public.is_invited_to_house(p_house_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.house_invited_emails e on e.email = lower(u.email)
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and e.house_id = p_house_id
  );
$$;

revoke all on function public.is_invited_to_house(uuid, uuid) from public, anon, authenticated;

create function public.add_invited_email(p_house_id uuid, p_email text)
returns public.house_invited_emails
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row public.house_invited_emails;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  insert into public.house_invited_emails (house_id, email, invited_by)
  values (p_house_id, v_email, v_uid)
  on conflict (house_id, email) do update set email = excluded.email
  returning * into v_row;

  -- The address stays out of the payload: every member can read the activity log.
  perform public.log_activity(p_house_id, v_uid, 'email_invited', 'invited_email', v_row.id);
  return v_row;
end $$;

create function public.remove_invited_email(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_house uuid;
begin
  select house_id into v_house from public.house_invited_emails where id = p_id;
  if v_house is null or not public.is_house_admin(v_house) then raise exception 'FORBIDDEN'; end if;

  delete from public.house_invited_emails where id = p_id;
  perform public.log_activity(v_house, auth.uid(), 'email_uninvited', 'invited_email', p_id);
end $$;

revoke all on function public.add_invited_email(uuid, text), public.remove_invited_email(uuid)
  from public, anon;
grant execute on function public.add_invited_email(uuid, text), public.remove_invited_email(uuid)
  to authenticated;

drop function public.create_invite(uuid, int, int, boolean);

create function public.create_invite(
  p_house_id uuid,
  p_revoke_existing boolean default false
) returns public.house_invites
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_inv public.house_invites;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  perform 1 from public.houses where id = p_house_id for update;

  if p_revoke_existing then
    update public.house_invites set revoked_at = now()
     where house_id = p_house_id and revoked_at is null;
  end if;

  insert into public.house_invites (house_id, code, created_by, expires_at)
  values (p_house_id, public.generate_invite_code(), v_uid, now() + interval '7 days')
  returning * into v_inv;

  perform public.log_activity(p_house_id, v_uid, 'invite_created', 'invite', v_inv.id,
                              jsonb_build_object('regenerated', p_revoke_existing));
  return v_inv;
end $$;

revoke all on function public.create_invite(uuid, boolean) from public, anon;
grant execute on function public.create_invite(uuid, boolean) to authenticated;

alter table public.house_invites drop column max_uses;

-- status: valid | already_member | invalid | revoked | expired | not_invited | full | house_limit
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

-- status: joined | pending | already_member | invalid | revoked | expired | not_invited | full | house_limit
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

  update public.house_invites set uses = uses + 1 where id = v_inv.id;

  perform public.log_activity(
    v_house.id, v_uid,
    case when v_status = 'active' then 'member_joined' else 'join_requested' end,
    'member', v_uid, jsonb_build_object('invite_id', v_inv.id));

  return jsonb_build_object(
    'status', case when v_status = 'active' then 'joined' else 'pending' end,
    'house_id', v_house.id);
end $$;
