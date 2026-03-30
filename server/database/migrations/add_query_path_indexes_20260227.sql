-- =============================================================
-- Query Path Indexes (Full Optimization Pass - 2026-02-27)
-- Target: reduce latency on hot read/write paths touched in this pass.
-- =============================================================

-- Undone-post lookups used by sale-undone and posts routes/controllers.
DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_posts_undone_recent
    ON posts (status, updated_at DESC, created_at DESC)
    WHERE status = 'undone';
  ELSE
    RAISE NOTICE 'Skipping idx_posts_undone_recent: table posts not found';
  END IF;
END
$$;

-- Transaction status checks for sale initiation and pending-sale listing.
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_post_status
    ON transactions (post_id, status);
  ELSE
    RAISE NOTICE 'Skipping idx_transactions_post_status: table transactions not found';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_pending_seller_created
    ON transactions (seller_id, created_at DESC)
    WHERE status = 'pending_buyer_confirm';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_pending_buyer_created
    ON transactions (buyer_id, created_at DESC)
    WHERE status = 'pending_buyer_confirm';
  END IF;
END
$$;

-- Buyer inquiry access patterns (seller list, post detail, spam checks).
DO $$
BEGIN
  IF to_regclass('public.buyer_inquiries') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_post_created
    ON buyer_inquiries (post_id, created_at DESC);
  ELSE
    RAISE NOTICE 'Skipping buyer_inquiries indexes: table buyer_inquiries not found';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.buyer_inquiries') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'buyer_inquiries'
      AND column_name = 'phone'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_phone_created
    ON buyer_inquiries (phone, created_at DESC);
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'buyer_inquiries'
      AND column_name = 'phone_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_phone_number_created
    ON buyer_inquiries (phone_number, created_at DESC);
  ELSE
    RAISE NOTICE 'Skipping phone index: buyer_inquiries has neither phone nor phone_number column';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.buyer_inquiries') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'buyer_inquiries'
      AND column_name = 'is_spam'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_status_created
    ON buyer_inquiries (status, created_at DESC)
    WHERE is_spam = false;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_status_created
    ON buyer_inquiries (status, created_at DESC);
  END IF;
END
$$;

-- Feed and channel timelines.
DO $$
BEGIN
  IF to_regclass('public.feeds') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_feeds_user_created
    ON feeds (user_id, created_at DESC);
  ELSE
    RAISE NOTICE 'Skipping feeds indexes: table feeds not found';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.feeds') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_feeds_created_desc
    ON feeds (created_at DESC);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.channel_posts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created
    ON channel_posts (channel_id, created_at DESC);
  ELSE
    RAISE NOTICE 'Skipping channel_posts indexes: table channel_posts not found';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.channel_posts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_video
    ON channel_posts (channel_id)
    WHERE video_url IS NOT NULL;
  END IF;
END
$$;
