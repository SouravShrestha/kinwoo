-- Bought items accumulate forever, and the items endpoint used to return all of them. Clients now
-- load recent purchases with the open items and page through older ones with this function.
--
-- A page is the newest p_limit bought items before p_before, plus every item bought at the same
-- instant as the last one: batch items share a timestamp, so a batch never splits across pages.
-- SECURITY INVOKER, so RLS on grocery_items and grocery_purchases decides what is visible.
create function public.bought_item_page(p_list_id uuid, p_before timestamptz, p_limit int)
returns table (item_id uuid, bought_at timestamptz)
language sql stable set search_path = '' as $$
  with latest as (
    select p.item_id, max(p.bought_at) as bought_at
      from public.grocery_purchases p
      join public.grocery_items i on i.id = p.item_id
     where i.list_id = p_list_id
       and i.status = 'bought'
     group by p.item_id
  ),
  page as (
    select l.item_id, l.bought_at
      from latest l
     where l.bought_at < p_before
     order by l.bought_at desc, l.item_id
     limit greatest(1, least(p_limit, 200))
  ),
  edge as (select min(bought_at) as bought_at from page)
  select l.item_id, l.bought_at
    from latest l, edge
   where l.bought_at < p_before
     and l.bought_at >= edge.bought_at
   order by l.bought_at desc, l.item_id;
$$;

revoke all on function public.bought_item_page(uuid, timestamptz, int) from public, anon;
grant execute on function public.bought_item_page(uuid, timestamptz, int) to authenticated;
