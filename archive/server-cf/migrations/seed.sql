-- Seed default categories
INSERT OR IGNORE INTO categories (id, name, slug, sort_order) VALUES
  ('cat_electronics', 'Electronics',   'electronics',   10),
  ('cat_mobiles',     'Mobiles',       'mobiles',       20),
  ('cat_vehicles',    'Vehicles',      'vehicles',      30),
  ('cat_properties',  'Properties',    'properties',    40),
  ('cat_jobs',        'Jobs',          'jobs',          50),
  ('cat_furniture',   'Furniture',     'furniture',     60),
  ('cat_fashion',     'Fashion',       'fashion',       70),
  ('cat_books',       'Books & Hobbies','books-hobbies', 80),
  ('cat_services',    'Services',      'services',      90),
  ('cat_pets',        'Pets',          'pets',         100);
