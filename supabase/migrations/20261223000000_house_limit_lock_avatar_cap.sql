-- The three-houses limit counts a user's active houses and then inserts. Two requests for the same
-- user (a join and an approval, say) both read the old count and both insert. A per-user advisory
-- lock, held until the transaction ends, makes the second request count the first one's row.
-- join_house and resolve_join_request lock the house row first, so the two locks are always taken
-- in the same order.
CREATE OR REPLACE FUNCTION public.create_house(p_name text, p_address text DEFAULT NULL::text) RETURNS public.houses
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house public.houses;
  v_n int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 40 then
    raise exception 'INVALID_NAME';
  end if;
  if char_length(btrim(coalesce(p_address, ''))) not between 10 and 120 then
    raise exception 'INVALID_ADDRESS';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('house_limit:' || v_uid::text, 0));

  select count(*) into v_n from public.house_members
   where user_id = v_uid and status = 'active';
  if v_n >= public.max_houses_per_user() then raise exception 'HOUSE_LIMIT_REACHED'; end if;

  insert into public.houses (name, address, created_by)
  values (btrim(p_name), btrim(p_address), v_uid)
  returning * into v_house;

  insert into public.house_members (house_id, user_id, role, status, joined_at)
  values (v_house.id, v_uid, 'admin', 'active', now());

  insert into public.house_invites (house_id, code, created_by)
  values (v_house.id, public.generate_invite_code(), v_uid);

  insert into public.grocery_lists (house_id, name, icon, position, visibility, is_default, created_by)
  values (v_house.id, 'Groceries', '🛒', 0, 'shared', true, v_uid);

  perform public.log_activity(v_house.id, v_uid, 'house_created', 'house', v_house.id,
                              jsonb_build_object('name', v_house.name));

  return v_house;
end $$;

CREATE OR REPLACE FUNCTION public.join_house(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

  perform pg_advisory_xact_lock(hashtextextended('house_limit:' || v_uid::text, 0));

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

    perform pg_advisory_xact_lock(hashtextextended('house_limit:' || p_user_id::text, 0));

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

-- Each person keeps one uploaded avatar; the client deletes the old file after a change. Five
-- leaves room for a failed cleanup, and stops a script from filling the bucket with new names.
-- The count lives in a SECURITY DEFINER function because a policy on storage.objects that queries
-- storage.objects directly recurses into that table's own select policy.
CREATE OR REPLACE FUNCTION public.own_avatar_upload_count() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select count(*)::integer from storage.objects o
   where o.bucket_id = 'uploaded_avatars'
     and o.name like (select auth.uid())::text || '/%';
$$;

REVOKE ALL ON FUNCTION public.own_avatar_upload_count() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.own_avatar_upload_count() TO authenticated, service_role;

ALTER POLICY "Users upload their own avatar" ON storage.objects
  WITH CHECK (
    bucket_id = 'uploaded_avatars'
    AND name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
    AND public.own_avatar_upload_count() < 5
  );
