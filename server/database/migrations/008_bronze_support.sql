-- Migration 008: Enable Bronze in legacy plan check constraints
-- Keeps compatibility with older schemas that still use plan_type/plan_purchased checks.

DO $$
DECLARE
  constraint_row record;
  plan_purchased_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'plan_purchased'
  ) INTO plan_purchased_exists;

  IF plan_purchased_exists THEN
    FOR constraint_row IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.payments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%plan_purchased%'
    LOOP
      EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS %I', constraint_row.conname);
    END LOOP;

    EXECUTE $c$
      ALTER TABLE public.payments
      ADD CONSTRAINT payments_plan_purchased_check
      CHECK (plan_purchased IN ('basic', 'bronze', 'silver', 'premium'))
    $c$;
  END IF;
END $$;

DO $$
DECLARE
  constraint_row record;
  plan_type_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'plan_type'
  ) INTO plan_type_exists;

  IF plan_type_exists THEN
    FOR constraint_row IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.user_subscriptions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%plan_type%'
    LOOP
      EXECUTE format('ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS %I', constraint_row.conname);
    END LOOP;

    EXECUTE $c$
      ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_plan_type_check
      CHECK (plan_type IN ('basic', 'bronze', 'silver', 'premium'))
    $c$;
  END IF;
END $$;
