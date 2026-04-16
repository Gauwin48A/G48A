-- Leo: Category grouping + normalization

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS category_group TEXT;

-- Normalize Properties -> Real Estate
DO $$
DECLARE
  properties_id INT;
  real_estate_id INT;
BEGIN
  SELECT category_id INTO properties_id
  FROM categories
  WHERE LOWER(name) = 'properties'
  LIMIT 1;

  SELECT category_id INTO real_estate_id
  FROM categories
  WHERE LOWER(name) = 'real estate'
  LIMIT 1;

  IF properties_id IS NOT NULL AND real_estate_id IS NOT NULL AND properties_id <> real_estate_id THEN
    UPDATE posts SET category_id = real_estate_id WHERE category_id = properties_id;
    UPDATE subcategories SET category_id = real_estate_id WHERE category_id = properties_id;
    DELETE FROM categories WHERE category_id = properties_id;
  ELSIF properties_id IS NOT NULL AND real_estate_id IS NULL THEN
    UPDATE categories SET name = 'Real Estate' WHERE category_id = properties_id;
  END IF;
END $$;

-- Normalize Home -> Home & Living
DO $$
DECLARE
  home_id INT;
  home_living_id INT;
BEGIN
  SELECT category_id INTO home_id
  FROM categories
  WHERE LOWER(name) = 'home'
  LIMIT 1;

  SELECT category_id INTO home_living_id
  FROM categories
  WHERE LOWER(name) = 'home & living'
  LIMIT 1;

  IF home_id IS NOT NULL AND home_living_id IS NOT NULL AND home_id <> home_living_id THEN
    UPDATE posts SET category_id = home_living_id WHERE category_id = home_id;
    UPDATE subcategories SET category_id = home_living_id WHERE category_id = home_id;
    DELETE FROM categories WHERE category_id = home_id;
  ELSIF home_id IS NOT NULL AND home_living_id IS NULL THEN
    UPDATE categories SET name = 'Home & Living' WHERE category_id = home_id;
  END IF;
END $$;

-- Populate category_group
UPDATE categories
SET category_group = CASE
  WHEN LOWER(name) LIKE '%electronics%' OR LOWER(name) IN ('mobiles', 'mobile') THEN 'electronics'
  WHEN LOWER(name) LIKE '%fashion%' THEN 'fashion'
  WHEN LOWER(name) LIKE '%vehicle%' THEN 'vehicles'
  ELSE 'others'
END
WHERE category_group IS NULL OR category_group = '';
