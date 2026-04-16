-- Migration 010: Align subscription plan quotas with final tier spec
-- Bronze: no boosts/featured/spotlights
-- Silver: 5 boosts + 5 featured + 5 spotlights per 6-month period
-- Premium: 5 boosts + 5 featured + 5 spotlights per month

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
  ) THEN
    UPDATE subscription_plans
    SET boost_quota_monthly = 0,
        featured_quota_monthly = 0,
        spotlight_quota_monthly = 0
    WHERE name = 'bronze';

    UPDATE subscription_plans
    SET boost_quota_monthly = 5,
        featured_quota_monthly = 5,
        spotlight_quota_monthly = 5
    WHERE name = 'silver';

    UPDATE subscription_plans
    SET boost_quota_monthly = 5,
        featured_quota_monthly = 5,
        spotlight_quota_monthly = 5
    WHERE name = 'premium';
  END IF;
END $$;
