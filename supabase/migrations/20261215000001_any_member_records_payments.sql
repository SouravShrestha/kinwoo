-- Any house member records a payment between any two people who belong to (or belonged to) the
-- house, as they already can edit or delete one.
CREATE OR REPLACE FUNCTION public.record_settlement(p_house_id uuid, p_payer_id uuid, p_payee_id uuid, p_amount_paise integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  if p_payer_id is null or p_payee_id is null or p_payer_id = p_payee_id
     or p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;

  if (
    select count(*) from public.house_members m
     where m.house_id = p_house_id and m.user_id in (p_payer_id, p_payee_id)
  ) <> 2 then
    raise exception 'NOT_A_MEMBER';
  end if;

  insert into public.settlements (house_id, payer_id, payee_id, amount_paise, created_by)
  values (p_house_id, p_payer_id, p_payee_id, p_amount_paise, v_uid)
  returning id into v_id;

  perform public.log_activity(
    p_house_id, v_uid, 'settlement.recorded', 'settlement', v_id,
    jsonb_build_object(
      'payer_id', p_payer_id,
      'payee_id', p_payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = p_payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = p_payee_id),
      'amount_paise', p_amount_paise
    )
  );

  return v_id;
end $$;
