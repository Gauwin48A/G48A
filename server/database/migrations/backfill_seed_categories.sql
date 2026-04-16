-- ============================================================
-- Backfill correct categories for seed posts (I-08)
-- Fixes: ~21% of seed posts have category-product mismatches
--   e.g. MacBook Pro in Fashion, Toyota Fortuner in Fashion,
--   Washing Machine in Beauty, etc.
--
-- Strategy: use title keyword matching to assign the correct
--   category. Only updates posts where category clearly mismatches
--   the product keyword in the title.
--
-- Safe to run multiple times — uses explicit WHERE on title.
-- ============================================================

DO $$
DECLARE
  cat_electronics  TEXT;
  cat_vehicles     TEXT;
  cat_appliances   TEXT;
  cat_fashion      TEXT;
  cat_furniture    TEXT;
  cat_sports       TEXT;
  cat_beauty       TEXT;
  cat_books        TEXT;
  cat_realestate   TEXT;
  v_count          INTEGER := 0;
  v_total          INTEGER := 0;
BEGIN

  -- Fetch category IDs by name (case-insensitive match)
  SELECT category_id INTO cat_electronics FROM categories WHERE LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) = 'electronics' LIMIT 1;
  SELECT category_id INTO cat_vehicles    FROM categories WHERE LOWER(name) LIKE '%vehicle%'   OR LOWER(name) LIKE '%auto%'   OR LOWER(name) = 'vehicles'    LIMIT 1;
  SELECT category_id INTO cat_appliances  FROM categories WHERE LOWER(name) LIKE '%appliance%' OR LOWER(name) LIKE '%home appliance%'                          LIMIT 1;
  SELECT category_id INTO cat_fashion     FROM categories WHERE LOWER(name) = 'fashion'        OR LOWER(name) LIKE '%cloth%'  OR LOWER(name) LIKE '%apparel%' LIMIT 1;
  SELECT category_id INTO cat_furniture   FROM categories WHERE LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%home%decor%'                              LIMIT 1;
  SELECT category_id INTO cat_sports      FROM categories WHERE LOWER(name) LIKE '%sport%'     OR LOWER(name) LIKE '%fitness%'                                 LIMIT 1;
  SELECT category_id INTO cat_beauty      FROM categories WHERE LOWER(name) LIKE '%beauty%'    OR LOWER(name) LIKE '%cosmetic%'                                LIMIT 1;
  SELECT category_id INTO cat_books       FROM categories WHERE LOWER(name) LIKE '%book%'      OR LOWER(name) LIKE '%education%'                               LIMIT 1;
  SELECT category_id INTO cat_realestate  FROM categories WHERE LOWER(name) LIKE '%real estate%' OR LOWER(name) LIKE '%property%'                             LIMIT 1;

  -- Electronics: Laptops, Phones, TVs, Cameras
  IF cat_electronics IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_electronics
    WHERE category_id != cat_electronics
      AND (
        LOWER(title) SIMILAR TO '%(laptop|macbook|iphone|samsung galaxy|pixel|oneplus|realme|redmi|mi note|oppo|vivo|ipad|tablet|tv|television|monitor|camera|nikon|canon|sony|headphone|earphone|airpod|speaker|router|dell|hp envy|lenovo|asus|acer|chromebook|gaming pc|playstation|xbox|nintendo)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Electronics: reassigned % posts', v_count;
  END IF;

  -- Vehicles: Cars, Bikes, Scooters
  IF cat_vehicles IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_vehicles
    WHERE category_id != cat_vehicles
      AND (
        LOWER(title) SIMILAR TO '%(toyota|honda|suzuki|hyundai|tata|mahindra|bajaj|hero|tvs|royal enfield|yamaha|kawasaki|bike|scooter|activa|pulsar|fortuner|innova|swift|baleno|creta|nexon|scorpio|car|motorcycle|moped|auto rickshaw|truck|bolero|xuv)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Vehicles: reassigned % posts', v_count;
  END IF;

  -- Home Appliances: Washing machines, Fridges, ACs
  IF cat_appliances IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_appliances
    WHERE category_id != cat_appliances
      AND (
        LOWER(title) SIMILAR TO '%(washing machine|refrigerator|fridge|air conditioner|ac |microwave|dishwasher|vacuum cleaner|water purifier|ro purifier|geyser|water heater|oven|mixer|grinder|juicer|toaster|iron|ceiling fan|exhaust fan|cooler)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Appliances: reassigned % posts', v_count;
  END IF;

  -- Furniture: Sofas, Beds, Tables, Chairs
  IF cat_furniture IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_furniture
    WHERE category_id != cat_furniture
      AND (
        LOWER(title) SIMILAR TO '%(sofa|couch|bed|mattress|wardrobe|almirah|dining table|coffee table|study table|office chair|gaming chair|bookshelf|shelf|cabinet|cupboard|dressing table|shoe rack|tv unit|curtain)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Furniture: reassigned % posts', v_count;
  END IF;

  -- Sports & Fitness
  IF cat_sports IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_sports
    WHERE category_id != cat_sports
      AND (
        LOWER(title) SIMILAR TO '%(cricket bat|cricket kit|football|badminton|tennis|gym|dumbbell|barbell|treadmill|cycle|bicycle|helmet|sports shoe|running shoe|yoga mat|swimming|basketball|volleyball|carrom)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Sports: reassigned % posts', v_count;
  END IF;

  -- Books & Education
  IF cat_books IS NOT NULL THEN
    UPDATE posts
    SET category_id = cat_books
    WHERE category_id != cat_books
      AND (
        LOWER(title) SIMILAR TO '%(book|textbook|novel|ncert|jee|neet|upsc|gate exam|competitive exam|study material|notes|guide|reference book|encyclopedia|dictionary|magazine|comic|manga)%'
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    RAISE NOTICE 'Books: reassigned % posts', v_count;
  END IF;

  RAISE NOTICE 'Category backfill complete. Total posts reassigned: %', v_total;

END $$;
