-- Renames and reorders the built-in grocery categories, then adds new ones.
-- Rows are updated in place so grocery_items.category_id references stay valid.

update public.grocery_categories c
   set name = v.name, position = v.position
  from (values
    ('Other', 'Other', 1),
    ('Household', 'Household', 2),
    ('Vegetables', 'Vegetables', 3),
    ('Fruits', 'Fruits', 4),
    ('Dairy', 'Dairy', 5),
    ('Staples', 'Staples', 6),
    ('Spices', 'Spices', 7),
    ('Meat & Fish', 'Meat', 8),
    ('Bakery', 'Bakery', 9),
    ('Snacks', 'Snacks', 10),
    ('Beverages', 'Beverages', 11),
    ('Personal Care', 'Personal', 12)
  ) as v(old_name, name, position)
 where c.house_id is null and c.name = v.old_name;

insert into public.grocery_categories (house_id, name, position) values
  (null, 'Frozen', 13),
  (null, 'Baby', 18),
  (null, 'Pet', 19),
  (null, 'Health', 17),
  (null, 'Kitchenware', 14),
  (null, 'Stationery', 20),
  (null, 'Electrical', 21),
  (null, 'Fuel', 15),
  (null, 'Utilities', 16),
  (null, 'Pooja', 22),
  (null, 'Laundry', 23)
;
