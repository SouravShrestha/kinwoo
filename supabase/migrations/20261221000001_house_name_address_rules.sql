-- Name is 2 to 40 characters and the address is required, 10 to 120. Enforced for new houses and
-- whenever either column changes, so houses created earlier still save their other settings.
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

CREATE FUNCTION public.check_house_text() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.name is distinct from old.name
     and char_length(btrim(new.name)) not between 2 and 40 then
    raise exception 'INVALID_NAME';
  end if;
  if new.address is distinct from old.address
     and char_length(btrim(coalesce(new.address, ''))) not between 10 and 120 then
    raise exception 'INVALID_ADDRESS';
  end if;
  return new;
end $$;

CREATE TRIGGER houses_check_text BEFORE UPDATE OF name, address ON public.houses
    FOR EACH ROW EXECUTE FUNCTION public.check_house_text();
