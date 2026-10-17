insert into public.grocery_categories (house_id, name, position)
select null, v.name, v.position
from (values ('Staples', 3), ('Spices', 4)) as v (name, position)
where not exists (
  select 1 from public.grocery_categories c
   where c.house_id is null and c.name = v.name
);

update public.grocery_categories
   set position = case name
     when 'Fruits' then 1
     when 'Vegetables' then 2
     when 'Staples' then 3
     when 'Spices' then 4
     when 'Dairy' then 5
     when 'Meat & Fish' then 6
     when 'Bakery' then 7
     when 'Snacks' then 8
     when 'Beverages' then 9
     when 'Household' then 10
     when 'Personal Care' then 11
     when 'Other' then 12
   end
 where house_id is null
   and name in (
     'Fruits', 'Vegetables', 'Staples', 'Spices', 'Dairy', 'Meat & Fish', 'Bakery',
     'Snacks', 'Beverages', 'Household', 'Personal Care', 'Other'
   );
