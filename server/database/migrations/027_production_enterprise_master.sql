-- Migration 027: Enterprise Master Foundation (35-Point Directive)

-- 1. Commission Rules & Platform Settings (Configurable 2.5% + Rs.150 min rule)
CREATE TABLE IF NOT EXISTS commission_rules (
  id SERIAL PRIMARY KEY,
  commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 2.50,
  minimum_fee DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  maximum_fee DECIMAL(10,2),
  category VARCHAR(50),
  plan_slug VARCHAR(50),
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO commission_rules (commission_type, commission_rate, minimum_fee, is_active)
VALUES ('PERCENTAGE', 2.50, 150.00, true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description)
VALUES 
  ('DISPUTE_DEADLINE_DAYS', '10', 'Days before dispute auto-escalates'),
  ('MIN_RETENTION_DAYS', '60', 'Min retention period for media'),
  ('MAX_RETENTION_DAYS', '90', 'Max retention period for media')
ON CONFLICT (key) DO NOTHING;

-- 2. Immutable Financial Ledger & Reconciliation
CREATE TABLE IF NOT EXISTS financial_ledger (
  id BIGSERIAL PRIMARY KEY,
  reference_id VARCHAR(100) NOT NULL,
  order_id TEXT,
  user_id TEXT,
  event_type VARCHAR(50) NOT NULL, -- BUYER_PAYMENT, PLATFORM_FEE, SELLER_TRANSFER, REFUND, REVERSAL, ADJUSTMENT
  direction VARCHAR(10) NOT NULL,  -- DEBIT, CREDIT
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'COMPLETED',
  provider VARCHAR(30) DEFAULT 'RAZORPAY',
  provider_reference VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, EXCEPTION
  total_records INT DEFAULT 0,
  matched_records INT DEFAULT 0,
  mismatched_records INT DEFAULT 0,
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Support Ticket System
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- Payment, KYC, Subscription, Order, Technical
  priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status VARCHAR(20) DEFAULT 'OPEN',     -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
  subject TEXT NOT NULL,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- USER, AGENT, SYSTEM
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Translation & Feature Flags
CREATE TABLE IF NOT EXISTS post_translations (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  translation_provider VARCHAR(30) DEFAULT 'DEFAULT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, language)
);

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key VARCHAR(100) PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT TRUE,
  rollout_percentage INT DEFAULT 100,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, is_enabled, rollout_percentage, description)
VALUES 
  ('ENABLE_REELS', true, 100, 'Enable Short Videos and Reels'),
  ('ENABLE_TRANSLATION', true, 100, 'Enable Content Translation Engine'),
  ('ENABLE_NEW_CHECKOUT', true, 100, 'Enable Row-Locked Inventory Checkout')
ON CONFLICT (flag_key) DO NOTHING;
