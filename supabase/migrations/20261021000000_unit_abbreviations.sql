update public.grocery_items
   set unit = case unit when 'pcs' then 'pc' when 'pack' then 'p' when 'dozen' then 'dz' end
 where unit in ('pcs', 'pack', 'dozen');

update public.grocery_purchases
   set unit = case unit when 'pcs' then 'pc' when 'pack' then 'p' when 'dozen' then 'dz' end
 where unit in ('pcs', 'pack', 'dozen');
