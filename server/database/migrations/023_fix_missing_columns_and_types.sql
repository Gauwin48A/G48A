-- Migration 023: Fix missing columns and type mismatches
-- Fixes:
--   1. users.is_active column referenced by login but missing
--   2. wishlists.user_id is integer but users.user_id is uuid
--   3. wishlists.post_id is integer but posts.post_id may need alignment

-- 1. Add is_active column to users (default true, existing users are active)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Fix wishlists.user_id type mismatch (integer → uuid)
--    Drop existing constraints first, then alter type
DO $$
BEGIN
  -- Drop foreign key constraints on wishlists if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'wishlists' AND constraint_type = 'FOREIGN KEY'
  ) THEN
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'wishlists' AND constraint_type = 'FOREIGN KEY'
      LOOP
        EXECUTE 'ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
      END LOOP;
    END;
  END IF;
END $$;

-- Alter user_id from integer to uuid (using text cast)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wishlists' AND column_name = 'user_id' AND udt_name = 'int4'
  ) THEN
    -- Truncate wishlists if any rows exist (integer IDs can't map to UUIDs)
    IF EXISTS (SELECT 1 FROM wishlists LIMIT 1) THEN
      TRUNCATE TABLE wishlists;
    END IF;
    ALTER TABLE wishlists ALTER COLUMN user_id TYPE uuid USING NULL;
    ALTER TABLE wishlists ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Alter post_id from integer to integer (posts.post_id is likely integer, check first)
-- posts.post_id type check — only alter if mismatch exists
DO $$
DECLARE
  posts_pk_type TEXT;
  wishlist_fk_type TEXT;
BEGIN
  SELECT udt_name INTO posts_pk_type FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'post_id';
  SELECT udt_name INTO wishlist_fk_type FROM information_schema.columns
    WHERE table_name = 'wishlists' AND column_name = 'post_id';

  IF posts_pk_type IS DISTINCT FROM wishlist_fk_type AND posts_pk_type IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM wishlists LIMIT 1) THEN
      TRUNCATE TABLE wishlists;
    END IF;
    EXECUTE format('ALTER TABLE wishlists ALTER COLUMN post_id TYPE %I USING NULL', posts_pk_type);
    ALTER TABLE wishlists ALTER COLUMN post_id SET NOT NULL;
  END IF;
END $$;

-- Re-add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'wishlists' AND constraint_name = 'wishlists_user_id_fkey'
  ) THEN
    ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;
