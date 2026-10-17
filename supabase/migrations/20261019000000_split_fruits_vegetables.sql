update public.grocery_categories
   set name = 'Vegetables'
 where house_id is null and name = 'Fruits & Vegetables';

insert into public.grocery_categories (house_id, name, position)
select null, 'Fruits', 1
where not exists (
  select 1 from public.grocery_categories where house_id is null and name = 'Fruits'
);

update public.grocery_categories
   set position = case name
     when 'Fruits' then 1
     when 'Vegetables' then 2
     when 'Dairy' then 3
     when 'Meat & Fish' then 4
     when 'Bakery' then 5
     when 'Snacks' then 6
     when 'Beverages' then 7
     when 'Household' then 8
     when 'Personal Care' then 9
     when 'Other' then 10
   end
 where house_id is null
   and name in (
     'Fruits', 'Vegetables', 'Dairy', 'Meat & Fish', 'Bakery', 'Snacks',
     'Beverages', 'Household', 'Personal Care', 'Other'
   );
