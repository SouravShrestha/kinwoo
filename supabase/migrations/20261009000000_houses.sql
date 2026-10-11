-- Houses, membership, invites, activity log, RLS and RPCs.
--
-- Clients can only READ these tables directly (plus a few safe column updates
-- on houses). Every other write goes through a SECURITY DEFINER RPC, which
-- enforces the business rules (last admin, member limit, and so on).
--
--   * Memberships are never hard-deleted, so history can show "Former member".
--   * RPCs return a status for bad invite codes instead of raising, so the
--     rate-limit attempt row is committed (a raise would roll it back).
--   * Raised errors use stable machine codes as the message, e.g. LAST_ADMIN.

create type public.house_role as enum ('admin', 'member');
create type public.member_status as enum ('active', 'pending', 'left', 'removed', 'rejected');

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  address text check (address is null or char_length(address) <= 200),
  default_split text not null default 'equal',
  require_approval boolean not null default false,
  member_limit int not null default 15 check (member_limit between 1 and 50),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.house_members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  role public.house_role not null default 'member',
  status public.member_status not null default 'active',
  invited_by uuid references public.profiles (id),
  joined_at timestamptz,
  left_at timestamptz,
  removed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (house_id, user_id)
);

create index house_members_user_active_idx
  on public.house_members (user_id) where status = 'active';
create index house_members_house_active_idx
  on public.house_members (house_id) where status = 'active';

create table public.house_invites (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  -- 6 chars, alphabet excludes 0 O 1 I L
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index house_invites_house_idx
  on public.house_invites (house_id) where revoked_at is null;

-- Append-only: no INSERT/UPDATE/DELETE grants for clients.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_house_idx on public.activity_log (house_id, created_at desc);

-- Rate limiting for code guessing. No policies = no client access.
-- Prune with pg_cron: delete from public.invite_attempts where created_at < now() - interval '1 day';
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index invite_attempts_user_idx on public.invite_attempts (user_id, created_at desc);

create trigger houses_set_updated_at
  before update on public.houses
  for each row execute function public.set_updated_at();

create trigger house_members_set_updated_at
  before update on public.house_members
  for each row execute function public.set_updated_at();

-- Helper functions are SECURITY DEFINER to avoid recursive RLS.

create function public.is_house_member(p_house_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.house_members m
    join public.houses h on h.id = m.house_id
    where m.house_id = p_house_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and h.deleted_at is null
  );
$$;

create function public.is_house_admin(p_house_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.house_members m
    join public.houses h on h.id = m.house_id
    where m.house_id = p_house_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'admin'
      and h.deleted_at is null
  );
$$;

-- Target may have any status, so "Former member" names still resolve in history.
create function public.shares_house_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.house_members me
    join public.house_members them on them.house_id = me.house_id
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and them.user_id = p_user_id
  );
$$;

create function public.log_activity(
  p_house_id uuid, p_actor uuid, p_type text,
  p_entity_type text default null, p_entity_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity_log (house_id, actor_id, type, entity_type, entity_id, payload)
  values (p_house_id, p_actor, p_type, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb));
$$;

create function public.generate_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  i int;
begin
  loop
    -- Bytes 0..5 of a v4 uuid are fully random.
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.house_invites where code = v_code);
  end loop;
  return v_code;
end $$;

-- 30 attempts per 10 minutes per user.
create function public.check_invite_rate_limit() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  select count(*) into v_n from public.invite_attempts
   where user_id = v_uid and created_at > now() - interval '10 minutes';
  if v_n >= 30 then raise exception 'RATE_LIMITED'; end if;
  insert into public.invite_attempts (user_id) values (v_uid);
end $$;

-- Stub until money lands: replace the body with a real balance check.
create function public.user_has_outstanding_balance(p_house_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select false;
$$;

alter table public.houses enable row level security;
alter table public.house_members enable row level security;
alter table public.house_invites enable row level security;
alter table public.activity_log enable row level security;
alter table public.invite_attempts enable row level security;

revoke all on public.houses, public.house_members, public.house_invites,
              public.activity_log, public.invite_attempts
  from anon, authenticated;

grant select on public.houses, public.house_members, public.house_invites,
                public.activity_log to authenticated;

grant update (name, emoji, address, default_split, require_approval, settings)
  on public.houses to authenticated;

-- Added alongside "Owners can read their profile"; Postgres ORs permissive policies.
create policy profiles_select_housemates on public.profiles
  for select to authenticated
  using (public.shares_house_with(id));

create policy houses_select on public.houses for select to authenticated
  using (public.is_house_member(id));

create policy houses_update_admin on public.houses for update to authenticated
  using (public.is_house_admin(id)) with check (public.is_house_admin(id));

-- "user_id = me" lets a removed user still see their own row flip to 'removed'
-- over realtime, so the client can drop the house immediately.
create policy house_members_select on public.house_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_house_member(house_id));

create policy house_invites_select_admin on public.house_invites for select to authenticated
  using (public.is_house_admin(house_id));

create policy activity_log_select on public.activity_log for select to authenticated
  using (public.is_house_member(house_id));

create function public.create_house(
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
  if v_n >= 10 then raise exception 'HOUSE_LIMIT_REACHED'; end if;

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

-- status: valid | already_member | invalid | revoked | expired | exhausted | full
create function public.get_invite_preview(p_code text) returns jsonb
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

-- status: joined | pending | already_member | invalid | revoked | expired | exhausted | full
create function public.join_house(p_code text) returns jsonb
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

create function public.create_invite(
  p_house_id uuid,
  p_expires_in_days int default 7,
  p_max_uses int default null,
  p_revoke_existing boolean default false
) returns public.house_invites
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_inv public.house_invites;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_expires_in_days not between 1 and 30 then raise exception 'INVALID_EXPIRY'; end if;
  if p_max_uses is not null and p_max_uses not between 1 and 100 then
    raise exception 'INVALID_MAX_USES';
  end if;

  perform 1 from public.houses where id = p_house_id for update;

  if p_revoke_existing then
    update public.house_invites set revoked_at = now()
     where house_id = p_house_id and revoked_at is null;
  end if;

  insert into public.house_invites (house_id, code, created_by, expires_at, max_uses)
  values (p_house_id, public.generate_invite_code(), v_uid,
          now() + make_interval(days => p_expires_in_days), p_max_uses)
  returning * into v_inv;

  perform public.log_activity(p_house_id, v_uid, 'invite_created', 'invite', v_inv.id,
                              jsonb_build_object('regenerated', p_revoke_existing));
  return v_inv;
end $$;

create function public.revoke_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_house uuid;
begin
  select house_id into v_house from public.house_invites where id = p_invite_id;
  if v_house is null or not public.is_house_admin(v_house) then raise exception 'FORBIDDEN'; end if;

  update public.house_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite_id;
  perform public.log_activity(v_house, auth.uid(), 'invite_revoked', 'invite', p_invite_id);
end $$;

create function public.set_member_role(
  p_house_id uuid, p_user_id uuid, p_role public.house_role
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_target public.house_members;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  -- Serialises admin changes so two demotions cannot both pass the last-admin check.
  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if v_target.role = p_role then return; end if;

  if v_target.role = 'admin' and p_role = 'member' then
    if not exists (select 1 from public.house_members
                    where house_id = p_house_id and status = 'active'
                      and role = 'admin' and user_id <> p_user_id) then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  update public.house_members set role = p_role where id = v_target.id;

  perform public.log_activity(p_house_id, auth.uid(), 'role_changed', 'member', p_user_id,
                              jsonb_build_object('from', v_target.role, 'to', p_role));
end $$;

create function public.remove_member(
  p_house_id uuid, p_user_id uuid, p_keep_debt boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_target public.house_members;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_user_id = v_uid then raise exception 'USE_LEAVE_HOUSE'; end if;

  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if not p_keep_debt and public.user_has_outstanding_balance(p_house_id, p_user_id) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members
     set status = 'removed', left_at = now(), removed_by = v_uid
   where id = v_target.id;

  perform public.log_activity(p_house_id, v_uid, 'member_removed', 'member', p_user_id,
                              jsonb_build_object('keep_debt', p_keep_debt));
end $$;

-- A sole member leaving soft-deletes the house.
create function public.leave_house(
  p_house_id uuid, p_acknowledge_debt boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_me public.house_members;
  v_other_admins int;
  v_others int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform 1 from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_me from public.house_members
   where house_id = p_house_id and user_id = v_uid and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  select count(*) filter (where role = 'admin'), count(*)
    into v_other_admins, v_others
    from public.house_members
   where house_id = p_house_id and status = 'active' and user_id <> v_uid;

  if v_others > 0 and v_me.role = 'admin' and v_other_admins = 0 then
    raise exception 'LAST_ADMIN';
  end if;

  if not p_acknowledge_debt and public.user_has_outstanding_balance(p_house_id, v_uid) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members set status = 'left', left_at = now() where id = v_me.id;

  if v_others = 0 then
    update public.houses set deleted_at = now() where id = p_house_id;
  end if;

  perform public.log_activity(p_house_id, v_uid, 'member_left', 'member', v_uid);
end $$;

-- Only used when require_approval is on; no UI in this slice.
create function public.resolve_join_request(
  p_house_id uuid, p_user_id uuid, p_approve boolean
) returns void
language plpgsql security definer set search_path = '' as $$
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

    update public.house_members set status = 'active', joined_at = now() where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'member_joined', 'member', p_user_id,
                                jsonb_build_object('approved', true));
  else
    update public.house_members set status = 'rejected' where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'join_rejected', 'member', p_user_id);
  end if;
end $$;

-- Postgres grants EXECUTE to PUBLIC by default; lock everything down first.
revoke all on function
  public.log_activity(uuid, uuid, text, text, uuid, jsonb),
  public.generate_invite_code(),
  public.check_invite_rate_limit(),
  public.user_has_outstanding_balance(uuid, uuid)
  from public, anon, authenticated;

revoke all on function
  public.is_house_member(uuid), public.is_house_admin(uuid), public.shares_house_with(uuid),
  public.create_house(text, text, text),
  public.get_invite_preview(text), public.join_house(text),
  public.create_invite(uuid, int, int, boolean), public.revoke_invite(uuid),
  public.set_member_role(uuid, uuid, public.house_role),
  public.remove_member(uuid, uuid, boolean),
  public.leave_house(uuid, boolean),
  public.resolve_join_request(uuid, uuid, boolean)
  from public, anon;

grant execute on function
  public.is_house_member(uuid), public.is_house_admin(uuid), public.shares_house_with(uuid),
  public.create_house(text, text, text),
  public.get_invite_preview(text), public.join_house(text),
  public.create_invite(uuid, int, int, boolean), public.revoke_invite(uuid),
  public.set_member_role(uuid, uuid, public.house_role),
  public.remove_member(uuid, uuid, boolean),
  public.leave_house(uuid, boolean),
  public.resolve_join_request(uuid, uuid, boolean)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.houses, public.house_members;
  end if;
end $$;
