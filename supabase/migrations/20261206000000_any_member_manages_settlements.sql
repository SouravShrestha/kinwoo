-- Any house member edits or deletes any payment in their house, as with expenses.
CREATE OR REPLACE FUNCTION public.update_settlement(p_settlement_id uuid, p_amount_paise integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_s record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, payer_id, payee_id, amount_paise into v_s
    from public.settlements
   where id = p_settlement_id and reversed_at is null
     for update;

  if not found or not public.is_house_member(v_s.house_id) then raise exception 'NOT_FOUND'; end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_amount_paise = v_s.amount_paise then return; end if;

  update public.settlements set amount_paise = p_amount_paise where id = p_settlement_id;

  perform public.log_activity(
    v_s.house_id, v_uid, 'settlement.updated', 'settlement', p_settlement_id,
    jsonb_build_object(
      'payer_id', v_s.payer_id,
      'payee_id', v_s.payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payee_id),
      'amount_paise', p_amount_paise,
      'previous_amount_paise', v_s.amount_paise
    )
  );
end $$;

CREATE OR REPLACE FUNCTION public.reverse_settlement(p_settlement_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_s record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, payer_id, payee_id, amount_paise into v_s
    from public.settlements
   where id = p_settlement_id and reversed_at is null
     for update;

  if not found or not public.is_house_member(v_s.house_id) then raise exception 'NOT_FOUND'; end if;

  update public.settlements
     set reversed_at = now(), reversed_by = v_uid
   where id = p_settlement_id;

  perform public.log_activity(
    v_s.house_id, v_uid, 'settlement.deleted', 'settlement', p_settlement_id,
    jsonb_build_object(
      'payer_id', v_s.payer_id,
      'payee_id', v_s.payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payee_id),
      'amount_paise', v_s.amount_paise
    )
  );
end $$;
