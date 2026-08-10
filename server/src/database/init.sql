-- =============================================================================
-- ZARUDA — Complete Database Schema
-- =============================================================================
-- All CREATE statements use IF NOT EXISTS so this file is idempotent
-- and safe to run on every server start.
-- =============================================================================

-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sequences for auto-generated human-readable IDs
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- =============================================================================
-- 1. IDENTITY & AUTH (Phase 3-4)
-- =============================================================================

-- Core users table (assumed already existing in production; only add columns here)

-- Core users table (already exists in production)
-- ALTER TABLE only used to add new columns; table assumed present.

-- User sessions for refresh token rotation
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL ,
    refresh_token_hash  TEXT NOT NULL,
    device_id           TEXT,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    is_revoked          BOOLEAN NOT NULL DEFAULT false,
    last_used_at        TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Login attempt tracking for brute-force protection
CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT ,
    identifier          TEXT,  -- email or username used
    ip_address          VARCHAR(45) NOT NULL,
    user_agent          TEXT,
    success             BOOLEAN NOT NULL DEFAULT false,
    failure_reason      VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL ,
    token_hash          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    verification_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL ,
    email               TEXT NOT NULL,
    token_hash          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verifications(user_id);

-- Phone verification tokens
CREATE TABLE IF NOT EXISTS phone_verifications (
    verification_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL ,
    phone               VARCHAR(20) NOT NULL,
    otp_hash            TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    attempts            INT NOT NULL DEFAULT 0,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON phone_verifications(user_id);

-- User devices
CREATE TABLE IF NOT EXISTS user_devices (
    device_id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL ,
    device_name         VARCHAR(100),
    device_type         VARCHAR(50),   -- 'android', 'ios', 'web'
    fcm_token           TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);

-- User blocks (when a user blocks another user)
CREATE TABLE IF NOT EXISTS user_blocks (
    block_id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    blocker_id          TEXT NOT NULL ,
    blocked_id          TEXT NOT NULL ,
    reason              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- =============================================================================
-- 2. USER PROFILE (Phase 5)
-- =============================================================================

-- Profiles table (auto-created by schemaGuard, defined here for completeness)
-- Uses CREATE TABLE IF NOT EXISTS so it won't overwrite existing.
CREATE TABLE IF NOT EXISTS profiles (
    user_id             TEXT PRIMARY KEY,
    full_name           VARCHAR(100),
    phone               VARCHAR(20),
    address             TEXT,
    avatar_url          TEXT,
    bio                 TEXT,
    verified            BOOLEAN DEFAULT false,
    business_name       VARCHAR(100),
    gstin               VARCHAR(15),
    website             TEXT,
    social_links        JSONB DEFAULT '{}',
    privacy_settings    JSONB DEFAULT '{"show_email": false, "show_phone": false}',
    language_preference VARCHAR(10) DEFAULT 'en',
    payout_upi_id       VARCHAR(100),
    payout_bank_details JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (notification preferences etc.)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id             TEXT PRIMARY KEY,
    push_enabled        BOOLEAN NOT NULL DEFAULT true,
    email_enabled       BOOLEAN NOT NULL DEFAULT true,
    sms_enabled         BOOLEAN NOT NULL DEFAULT false,
    marketing_emails    BOOLEAN NOT NULL DEFAULT false,
    language            VARCHAR(10) DEFAULT 'en',
    theme               VARCHAR(10) DEFAULT 'system',  -- 'light', 'dark', 'system'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. KYC SYSTEM (Phase 6-7)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
    kyc_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT UNIQUE ,
    pan_hash            TEXT,
    pan_full_name       VARCHAR(100),
    pan_status          VARCHAR(20),   -- 'VERIFIED', 'FAILED', 'MISMATCH'
    surepass_pan_ref_id VARCHAR(100),
    aadhaar_hash        TEXT,
    aadhaar_last_four   VARCHAR(4),
    surepass_aadhaar_client_id VARCHAR(100),
    encrypted_dob       TEXT,          -- AES-256-GCM encrypted date of birth
    encrypted_address   TEXT,          -- AES-256-GCM encrypted address
    bank_account_hash   TEXT,
    bank_ifsc           VARCHAR(20),
    bank_verified       BOOLEAN DEFAULT false,
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','PAN_VERIFIED','AADHAAR_PENDING','VERIFIED','FAILED','REJECTED','BANNED')),
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_pan_hash ON kyc_verifications(pan_hash);
CREATE INDEX IF NOT EXISTS idx_kyc_aadhaar_hash ON kyc_verifications(aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);

CREATE TABLE IF NOT EXISTS kyc_documents (
    document_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    document_type       VARCHAR(30) NOT NULL,  -- 'PAN', 'AADHAAR', 'BANK', 'SELFIE', 'BUSINESS_PROOF'
    document_url        TEXT NOT NULL,
    verified            BOOLEAN DEFAULT false,
    rejection_reason    TEXT,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
    verified_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_user ON kyc_documents(user_id);

CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT ,
    action              VARCHAR(50) NOT NULL,
    provider            VARCHAR(50) DEFAULT 'SUREPASS',
    provider_response_code VARCHAR(20),
    status              VARCHAR(20) NOT NULL,
    error_message       TEXT,
    ip_address          VARCHAR(45),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON kyc_audit_logs(user_id);

CREATE TABLE IF NOT EXISTS kyc_blacklist (
    id                  SERIAL PRIMARY KEY,
    aadhaar_hash        TEXT,
    mobile_hash         TEXT,
    pan_hash            TEXT,
    user_id             TEXT NOT NULL,
    reason              TEXT NOT NULL,
    banned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_blacklist_hashes ON kyc_blacklist(pan_hash, aadhaar_hash, mobile_hash);

-- =============================================================================
-- 4. SUBSCRIPTION SYSTEM (Phase 8)
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name           VARCHAR(50) NOT NULL,
    slug                VARCHAR(50) UNIQUE,
    description         TEXT,
    price               DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    billing_period      VARCHAR(20) DEFAULT 'monthly',
        CHECK (billing_period IN ('weekly','monthly','quarterly','yearly','lifetime')),
    duration_days       INT NOT NULL,
    gst_rate            DECIMAL(5,2) DEFAULT 18.00,
    razorpay_plan_id    VARCHAR(100),
    is_active           BOOLEAN DEFAULT true,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_features (
    feature_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code        VARCHAR(50) UNIQUE NOT NULL,
    feature_name        VARCHAR(100) NOT NULL,
    description         TEXT,
    feature_type        VARCHAR(20) DEFAULT 'boolean',
        CHECK (feature_type IN ('boolean','numeric','text','json')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_feature_limits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
    feature_id          UUID NOT NULL REFERENCES subscription_features(feature_id) ON DELETE CASCADE,
    value               TEXT NOT NULL,       -- 'true', '10', '{"max_images": 5}'
    overage_price       DECIMAL(10,2),       -- per-unit price for exceeding limit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    sub_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT ,
    plan_id             UUID REFERENCES subscription_plans(plan_id),
    razorpay_subscription_id VARCHAR(100),
    razorpay_order_id   VARCHAR(100),
    status              VARCHAR(20) NOT NULL,
        CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','PAUSED','PENDING')),
    start_date          TIMESTAMPTZ NOT NULL,
    end_date            TIMESTAMPTZ NOT NULL,
    auto_renew          BOOLEAN DEFAULT true,
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subs_active ON user_subscriptions(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_user_subs_expiry ON user_subscriptions(end_date) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS subscription_transactions (
    txn_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    sub_id              UUID REFERENCES user_subscriptions(sub_id),
    plan_id             UUID REFERENCES subscription_plans(plan_id),
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    gst_amount          DECIMAL(10,2),
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    status              VARCHAR(20) DEFAULT 'CREATED',
        CHECK (status IN ('CREATED','CAPTURED','FAILED','REFUNDED')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    sub_id              UUID REFERENCES user_subscriptions(sub_id),
    event_type          VARCHAR(50) NOT NULL,
        CHECK (event_type IN ('CREATED','ACTIVATED','RENEWED','EXPIRED','CANCELLED','PAUSED','RESUMED','UPGRADED','DOWNGRADED','PAYMENT_SUCCESS','PAYMENT_FAILED','REFUNDED')),
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id, created_at DESC);

-- =============================================================================
-- 5. PAYMENTS (Phase 9)
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_orders (
    order_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    razorpay_order_id   VARCHAR(100) UNIQUE NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    receipt             VARCHAR(100),
    status              VARCHAR(20) DEFAULT 'CREATED',
        CHECK (status IN ('CREATED','ATTEMPTED','PAID','EXPIRED','CANCELLED')),
    entity_type         VARCHAR(30),        -- 'subscription', 'order', 'coins'
    entity_id           TEXT,               -- ID of the related entity
    notes               JSONB DEFAULT '{}',
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay ON payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT ,
    order_id            UUID REFERENCES payment_orders(order_id),
    plan_id             UUID REFERENCES subscription_plans(plan_id),
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature  VARCHAR(255),
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    platform_fee        DECIMAL(10,2) DEFAULT 0,
    gst_on_fee          DECIMAL(10,2) DEFAULT 0,
    net_amount          DECIMAL(10,2),
    status              VARCHAR(20) DEFAULT 'CREATED',
        CHECK (status IN ('CREATED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
    error_code          VARCHAR(50),
    error_description   TEXT,
    raw_response        JSONB,
    coins_deducted      INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_order ON payment_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_payment ON payment_transactions(razorpay_payment_id);

CREATE TABLE IF NOT EXISTS payment_refunds (
    refund_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL REFERENCES payment_transactions(transaction_id),
    user_id             TEXT NOT NULL ,
    razorpay_refund_id  VARCHAR(100) UNIQUE,
    amount              DECIMAL(10,2) NOT NULL,
    reason              TEXT,
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','PROCESSED','FAILED')),
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id   VARCHAR(100) UNIQUE,
    event_type          VARCHAR(100) NOT NULL,
    payload             JSONB NOT NULL,
    signature           VARCHAR(255),
    verified            BOOLEAN DEFAULT false,
    processed           BOOLEAN DEFAULT false,
    processing_error    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_processed ON payment_webhook_events(processed);

CREATE TABLE IF NOT EXISTS payment_reconciliation (
    reconciliation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_date DATE NOT NULL,
    razorpay_count      INT DEFAULT 0,
    razorpay_amount     DECIMAL(12,2) DEFAULT 0,
    zaruda_count        INT DEFAULT 0,
    zaruda_amount       DECIMAL(12,2) DEFAULT 0,
    discrepancies       JSONB DEFAULT '[]',
    status              VARCHAR(20) DEFAULT 'PENDING',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reconciliation_date)
);

-- =============================================================================
-- 6. MARKETPLACE — SELLER ONBOARDING (Phase 10)
-- =============================================================================

CREATE TABLE IF NOT EXISTS razorpay_linked_accounts (
    account_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    razorpay_contact_id VARCHAR(100),
    razorpay_fund_account_id VARCHAR(100),
    account_number      VARCHAR(50),
    ifsc                VARCHAR(20),
    beneficiary_name    VARCHAR(100),
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REJECTED')),
    kyc_completed       BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS platform_fee_rules (
    rule_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    percentage          DECIMAL(5,2) NOT NULL,
    minimum_fee         DECIMAL(10,2) DEFAULT 0,
    maximum_fee         DECIMAL(10,2),
    applies_to          VARCHAR(20) DEFAULT 'all',
        CHECK (applies_to IN ('all','seller_tier','category','subscription_plan')),
    applies_to_value    VARCHAR(50),  -- tier name, category slug, plan slug
    effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until     TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_rules_active ON platform_fee_rules(is_active, effective_from);

-- =============================================================================
-- 7. PRODUCTS / LISTINGS (Phase 11)
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
    category_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) UNIQUE NOT NULL,
    description         TEXT,
    icon_url            TEXT,
    image_url           TEXT,
    parent_id           UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL,
    description         TEXT,
    icon_url            TEXT,
    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS products (
    product_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id           TEXT NOT NULL ,
    category_id         UUID REFERENCES categories(category_id),
    subcategory_id      UUID REFERENCES subcategories(subcategory_id),
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    price               DECIMAL(10,2) NOT NULL,
    compare_at_price    DECIMAL(10,2),     -- original/marked price
    currency            VARCHAR(3) DEFAULT 'INR',
    quantity            INT DEFAULT 1,
    condition           VARCHAR(20) DEFAULT 'new',
        CHECK (condition IN ('new','like_new','good','fair','used')),
    status              VARCHAR(20) DEFAULT 'DRAFT',
        CHECK (status IN ('DRAFT','PUBLISHED','PAUSED','SOLD_OUT','SUSPENDED','DELETED')),
    is_negotiable       BOOLEAN DEFAULT false,
    is_flash_sale       BOOLEAN DEFAULT false,
    brand               VARCHAR(100),
    model               VARCHAR(100),
    tags                TEXT[],
    search_vector       TSVECTOR,           -- PostgreSQL full-text search
    view_count          INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);

-- Function to auto-update search_vector
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(array_to_string(NEW.tags, ' '), ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search_vector current
DROP TRIGGER IF EXISTS trg_products_search ON products;
CREATE TRIGGER trg_products_search
    BEFORE INSERT OR UPDATE OF title, description, tags
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_search_update();

CREATE TABLE IF NOT EXISTS product_variants (
    variant_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,    -- e.g., 'Size M', 'Color Red'
    sku                 VARCHAR(100),
    price               DECIMAL(10,2),
    quantity            INT DEFAULT 0,
    attributes          JSONB DEFAULT '{}',
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_images (
    image_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    variant_id          UUID REFERENCES product_variants(variant_id) ON DELETE SET NULL,
    object_key          TEXT NOT NULL,           -- Cloudflare R2 object key
    media_type          VARCHAR(20) DEFAULT 'image',
    width               INT,
    height              INT,
    file_size           INT,
    is_primary          BOOLEAN DEFAULT false,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS product_documents (
    document_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    document_type       VARCHAR(50),           -- 'invoice', 'warranty', 'certificate'
    object_key          TEXT NOT NULL,
    original_name       VARCHAR(255),
    file_size           INT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_attributes (
    attribute_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    value               TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, name)
);

CREATE TABLE IF NOT EXISTS product_inventory (
    inventory_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    variant_id          UUID REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    quantity_change     INT NOT NULL,
    reason              VARCHAR(50),           -- 'sale', 'restock', 'adjustment', 'return'
    reference_id        TEXT,                  -- order_id or similar
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product ON product_inventory(product_id);

CREATE TABLE IF NOT EXISTS product_status_history (
    history_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    old_status          VARCHAR(20),
    new_status          VARCHAR(20) NOT NULL,
    changed_by          TEXT ,
    reason              TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_status_history ON product_status_history(product_id);

-- =============================================================================
-- 8. ORDERS (Phase 12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
    order_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number        VARCHAR(30) UNIQUE NOT NULL,  -- Human-readable: ZRD-2026-00001
    buyer_id            TEXT NOT NULL ,
    seller_id           TEXT NOT NULL ,
    product_id          UUID NOT NULL REFERENCES products(product_id),
    variant_id          UUID REFERENCES product_variants(variant_id),
    quantity            INT NOT NULL DEFAULT 1,
    unit_price          DECIMAL(10,2) NOT NULL,
    total_amount        DECIMAL(10,2) NOT NULL,
    platform_fee        DECIMAL(10,2) DEFAULT 0,
    gst_on_fee          DECIMAL(10,2) DEFAULT 0,
    seller_payout       DECIMAL(10,2),
    currency            VARCHAR(3) DEFAULT 'INR',
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','CONFIRMED','PAID','SHIPPED','DELIVERED','CANCELLED','REFUNDED','DISPUTED','COMPLETED')),
    payment_status      VARCHAR(20) DEFAULT 'PENDING',
        CHECK (payment_status IN ('PENDING','PAID','REFUNDED','PARTIALLY_REFUNDED')),
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
    item_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(product_id),
    variant_id          UUID REFERENCES product_variants(variant_id),
    product_name        VARCHAR(200) NOT NULL,
    variant_name        VARCHAR(100),
    quantity            INT NOT NULL,
    unit_price          DECIMAL(10,2) NOT NULL,
    total_price         DECIMAL(10,2) NOT NULL,
    image_url           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_addresses (
    address_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    address_type        VARCHAR(10) NOT NULL,  -- 'shipping', 'billing'
    full_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    line1               TEXT NOT NULL,
    line2               TEXT,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(100) NOT NULL,
    pincode             VARCHAR(10) NOT NULL,
    country             VARCHAR(50) DEFAULT 'India',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_addresses_order ON order_addresses(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
    history_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    old_status          VARCHAR(20),
    new_status          VARCHAR(20) NOT NULL,
    changed_by          TEXT ,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history ON order_status_history(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_payments (
    payment_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    transaction_id      UUID REFERENCES payment_transactions(transaction_id),
    amount              DECIMAL(10,2) NOT NULL,
    method              VARCHAR(30) DEFAULT 'razorpay',  -- 'razorpay', 'coins', 'wallet'
    status              VARCHAR(20) DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_shipments (
    shipment_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    status              VARCHAR(20) DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    event_type          VARCHAR(50) NOT NULL,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events ON order_events(order_id, created_at DESC);

-- =============================================================================
-- 9. SHIPMENTS / DELIVERY (Phase 15)
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipments (
    shipment_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    seller_id           TEXT NOT NULL ,
    buyer_id            TEXT NOT NULL ,
    carrier             VARCHAR(100),
    tracking_number     VARCHAR(100),
    lr_number           VARCHAR(100),       -- LR (Lorry Receipt) number for transport
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED')),
    estimated_delivery  TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    proof_of_delivery   TEXT,               -- image URL
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

CREATE TABLE IF NOT EXISTS shipment_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id         UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL,
    location            TEXT,
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id         UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL,
    location            TEXT,
    timestamp           TIMESTAMPTZ DEFAULT NOW(),
    raw_data            JSONB
);

CREATE TABLE IF NOT EXISTS delivery_confirmations (
    confirmation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    shipment_id         UUID REFERENCES shipments(shipment_id),
    confirmed_by        TEXT NOT NULL ,  -- buyer_id
    notes               TEXT,
    images              TEXT[],              -- proof images
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. SETTLEMENT ENGINE (Phase 14)
-- =============================================================================

CREATE TABLE IF NOT EXISTS seller_transfers (
    transfer_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id),
    seller_id           TEXT NOT NULL ,
    razorpay_transfer_id VARCHAR(100) UNIQUE,
    razorpay_payout_id  VARCHAR(100),
    amount              DECIMAL(10,2) NOT NULL,
    platform_fee        DECIMAL(10,2) DEFAULT 0,
    net_amount          DECIMAL(10,2) NOT NULL,
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','ON_HOLD','PROCESSED','RELEASED','FAILED','REVERSED')),
    hold_until          TIMESTAMPTZ,          -- escrow hold period
    released_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_transfers_seller ON seller_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transfers_order ON seller_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_transfers_status ON seller_transfers(status);

CREATE TABLE IF NOT EXISTS settlement_records (
    settlement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id           TEXT NOT NULL ,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    total_orders        INT DEFAULT 0,
    gross_amount        DECIMAL(12,2) DEFAULT 0,
    platform_fees       DECIMAL(12,2) DEFAULT 0,
    net_amount          DECIMAL(12,2) DEFAULT 0,
    razorpay_settlement_id VARCHAR(100),
    status              VARCHAR(20) DEFAULT 'PENDING',
    settled_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_seller ON settlement_records(seller_id, period_start DESC);

-- =============================================================================
-- 11. DISPUTES (Phase 16-17)
-- =============================================================================

CREATE TABLE IF NOT EXISTS disputes (
    dispute_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id),
    raised_by           TEXT NOT NULL ,
    raised_against      TEXT NOT NULL ,
    dispute_type        VARCHAR(30) NOT NULL,
        CHECK (dispute_type IN ('ITEM_NOT_RECEIVED','ITEM_DAMAGED','WRONG_ITEM','QUALITY_ISSUE','FRAUD','PAYMENT_ISSUE','OTHER')),
    description         TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        CHECK (status IN ('OPEN','UNDER_REVIEW','EVIDENCE_REQUESTED','ESCALATED','RESOLVED_SELLER','RESOLVED_BUYER','RESOLVED_PARTIAL','CANCELLED','CLOSED')),
    resolution          TEXT,
    resolved_by         TEXT ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);

CREATE TABLE IF NOT EXISTS dispute_parties (
    party_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id          UUID NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL ,
    role                VARCHAR(20) NOT NULL,  -- 'buyer', 'seller', 'admin'
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_parties ON dispute_parties(dispute_id);

CREATE TABLE IF NOT EXISTS dispute_evidence (
    evidence_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id          UUID NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    submitted_by        TEXT NOT NULL ,
    evidence_type       VARCHAR(30) NOT NULL,
        CHECK (evidence_type IN ('IMAGE','VIDEO','DOCUMENT','TEXT','TRACKING','PAYMENT_PROOF','CHAT_LOG')),
    object_key          TEXT,                -- R2 key for file evidence
    content             TEXT,                -- for text evidence
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_messages (
    message_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id          UUID NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    sender_id           TEXT NOT NULL ,
    message             TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages ON dispute_messages(dispute_id, created_at);

CREATE TABLE IF NOT EXISTS dispute_actions (
    action_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id          UUID NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    action_by           TEXT NOT NULL ,
    action_type         VARCHAR(50) NOT NULL,
        CHECK (action_type IN ('EVIDENCE_REQUEST','ESCALATE','RESOLVE','REFUND_BUYER','RELEASE_SELLER','SUSPEND_USER','CLOSE','REOPEN')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_resolutions (
    resolution_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id          UUID NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    decided_by          TEXT NOT NULL ,  -- admin_id
    decision            VARCHAR(30) NOT NULL,
        CHECK (decision IN ('SELLER_FAVOR','BUYER_FAVOR','PARTIAL','DISMISSED')),
    buyer_refund_amount DECIMAL(10,2),
    seller_payout_amount DECIMAL(10,2),
    platform_absorbed   DECIMAL(10,2) DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 12. NOTIFICATIONS (Phase 26)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    pref_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    category            VARCHAR(30) NOT NULL,
        CHECK (category IN ('auth','kyc','subscription','payment','order','shipment','delivery','dispute','page','post','comment','system','admin','marketing')),
    push_enabled        BOOLEAN DEFAULT true,
    email_enabled       BOOLEAN DEFAULT true,
    sms_enabled         BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS device_tokens (
    token_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    device_id           TEXT REFERENCES user_devices(device_id),
    fcm_token           TEXT NOT NULL,
    platform            VARCHAR(10) DEFAULT 'android',  -- 'android', 'ios', 'web'
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
-- fcm_token must be unique for the app's ON CONFLICT (fcm_token) upserts.
-- Dedupe first so the unique index can never fail on pre-existing duplicates.
DELETE FROM device_tokens a USING device_tokens b
  WHERE a.token_id > b.token_id AND a.fcm_token = b.fcm_token;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_fcm_token ON device_tokens(fcm_token);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    category            VARCHAR(30) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    body                TEXT,
    data                JSONB DEFAULT '{}',
    is_read             BOOLEAN DEFAULT false,
    is_sent             BOOLEAN DEFAULT false,
    sent_at             TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(is_sent) WHERE is_sent = false;

-- The notifications table may predate the granular shape the app (server + web +
-- native) writes to (receiver_id/sender_id/type/message/status). Add those columns
-- idempotently so push dispatch, the notification worker, and the web/app clients
-- all work against the same row. (Safe: ADD COLUMN IF NOT EXISTS)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deep_link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_attempts INT DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id, created_at DESC) WHERE receiver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id     UUID REFERENCES notifications(notification_id),
    user_id             TEXT NOT NULL ,
    event_type          VARCHAR(50) NOT NULL,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 13. CONTENT — PAGES (Phase 20)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pages (
    page_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            TEXT NOT NULL ,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL,
    description         TEXT,
    avatar_url          TEXT,
    cover_url           TEXT,
    category            VARCHAR(50),
    is_verified         BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    follower_count      INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_owner ON pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

CREATE TABLE IF NOT EXISTS page_members (
    member_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id             UUID NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL ,
    role                VARCHAR(20) NOT NULL DEFAULT 'member',
        CHECK (role IN ('owner','admin','moderator','member')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS page_posts (
    post_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id             UUID NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    author_id           TEXT NOT NULL ,
    content             TEXT NOT NULL,
    media               JSONB DEFAULT '[]',
    is_pinned           BOOLEAN DEFAULT false,
    status              VARCHAR(20) DEFAULT 'PUBLISHED',
        CHECK (status IN ('DRAFT','PUBLISHED','HIDDEN','REPORTED','REMOVED')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_posts_page ON page_posts(page_id, created_at DESC);

CREATE TABLE IF NOT EXISTS page_followers (
    follower_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id             UUID NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS page_reports (
    report_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id             UUID NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
    reported_by         TEXT NOT NULL ,
    reason              TEXT NOT NULL,
    status              VARCHAR(20) DEFAULT 'OPEN',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 14. CONTENT — POSTS / MEDIA (Phase 21-23)
-- =============================================================================

CREATE TABLE IF NOT EXISTS post_media (
    media_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id             TEXT NOT NULL ,
    user_id             TEXT NOT NULL,
    object_key          TEXT NOT NULL,           -- Cloudflare R2 key
    media_type          VARCHAR(20) NOT NULL,
        CHECK (media_type IN ('image','video','audio','document')),
    mime_type           VARCHAR(50),
    file_size           INT,
    width               INT,
    height              INT,
    duration            INT,                     -- for video/audio in seconds
    thumbnail_key       TEXT,                    -- generated thumbnail R2 key
    status              VARCHAR(20) DEFAULT 'PROCESSING',
        CHECK (status IN ('PROCESSING','READY','FAILED','DELETED')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_user ON post_media(user_id);
CREATE INDEX IF NOT EXISTS idx_post_media_status ON post_media(status) WHERE status = 'PROCESSING';

CREATE TABLE IF NOT EXISTS comments (
    comment_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id             TEXT NOT NULL,
    user_id             TEXT NOT NULL ,
    parent_comment_id   UUID REFERENCES comments(comment_id) ON DELETE CASCADE,
    content             TEXT NOT NULL,
    is_edited           BOOLEAN DEFAULT false,
    status              VARCHAR(20) DEFAULT 'ACTIVE',
        CHECK (status IN ('ACTIVE','HIDDEN','REPORTED','REMOVED')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
    like_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    target_type         VARCHAR(20) NOT NULL,
        CHECK (target_type IN ('post','comment','page_post','product')),
    target_id           TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);

CREATE TABLE IF NOT EXISTS shares (
    share_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    target_type         VARCHAR(20) NOT NULL,
    target_id           TEXT NOT NULL,
    platform            VARCHAR(20),         -- 'internal', 'whatsapp', 'share'
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saves (
    save_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL ,
    target_type         VARCHAR(20) NOT NULL,
    target_id           TEXT NOT NULL,
    collection_name     VARCHAR(100),        -- user-defined collection
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id, collection_name)
);

CREATE TABLE IF NOT EXISTS content_reports (
    report_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id         TEXT NOT NULL ,
    target_type         VARCHAR(20) NOT NULL,
        CHECK (target_type IN ('user','page','post','product','comment','order','message')),
    target_id           TEXT NOT NULL,
    reason              TEXT NOT NULL,
    description         TEXT,
    status              VARCHAR(20) DEFAULT 'OPEN',
        CHECK (status IN ('OPEN','UNDER_REVIEW','ACTION_TAKEN','DISMISSED','CLOSED')),
    reviewed_by         TEXT ,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);

-- =============================================================================
-- 14b. REVIEWS / RATINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    review_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    order_id            UUID REFERENCES orders(order_id) ON DELETE SET NULL,
    reviewer_id         TEXT NOT NULL ,
    rating              INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title               VARCHAR(200),
    description         TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    status              VARCHAR(20) DEFAULT 'PENDING',
        CHECK (status IN ('PENDING','APPROVED','REJECTED','HIDDEN')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, reviewer_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE TABLE IF NOT EXISTS review_images (
    image_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id           UUID NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    object_key          TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 14c. CHANNELS (Legacy — from existing schemaGuard)
-- =============================================================================

CREATE TABLE IF NOT EXISTS channels (
    channel_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id            TEXT NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    category            VARCHAR(50) DEFAULT 'General',
    logo_url            TEXT,
    cover_url           TEXT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_id);

-- =============================================================================
-- 14d. PREFERENCES (Legacy — from existing schemaGuard)
-- =============================================================================

CREATE TABLE IF NOT EXISTS preferences (
    user_id             TEXT PRIMARY KEY,
    location            TEXT,
    min_price           DECIMAL(10,2) DEFAULT 0,
    max_price           DECIMAL(10,2) DEFAULT 100000,
    categories          JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 15. ACCOUNTING / RECONCILIATION (Phase 32)
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_fees (
    fee_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(order_id),
    percentage          DECIMAL(5,2) NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    gst_amount          DECIMAL(10,2) DEFAULT 0,
    total_charged       DECIMAL(10,2) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_records (
    tax_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID REFERENCES payment_transactions(transaction_id),
    order_id            UUID REFERENCES orders(order_id),
    gst_rate            DECIMAL(5,2) NOT NULL,
    taxable_amount      DECIMAL(10,2) NOT NULL,
    gst_amount          DECIMAL(10,2) NOT NULL,
    tax_type            VARCHAR(20) DEFAULT 'GST',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 16. WEBHOOK SYSTEM (Phase 30)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    webhook_event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider            VARCHAR(50) NOT NULL,    -- 'razorpay', 'surepass'
    event_type          VARCHAR(100) NOT NULL,
    event_id_raw        VARCHAR(100),            -- provider's event ID
    payload             JSONB NOT NULL,
    signature           TEXT,
    signature_verified  BOOLEAN DEFAULT false,
    idempotency_key     VARCHAR(100) UNIQUE,
    processed           BOOLEAN DEFAULT false,
    processing_attempts INT DEFAULT 0,
    last_error          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed ON webhook_events(processed, created_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider, event_type);

CREATE TABLE IF NOT EXISTS webhook_processing_logs (
    log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_event_id    UUID NOT NULL,
    status              VARCHAR(20) NOT NULL,
    message             TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 17. AUDIT LOGGING (Phase 34)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT,
    action              VARCHAR(100) NOT NULL,
    entity_type         VARCHAR(50),
    entity_id           TEXT,
    old_values          JSONB,
    new_values          JSONB,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id            TEXT NOT NULL ,
    action              VARCHAR(100) NOT NULL,
    entity_type         VARCHAR(50) NOT NULL,
    entity_id           TEXT,
    old_values          JSONB,
    new_values          JSONB,
    reason              TEXT,
    ip_address          VARCHAR(45),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);

-- =============================================================================
-- 18. ACCOUNT SUSPENSIONS / RESTRICTIONS (Phase 17)
-- =============================================================================

CREATE TABLE IF NOT EXISTS suspensions (
    id                  SERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL,
    sale_id             INTEGER REFERENCES sales(id),
    reason              TEXT NOT NULL,
    suspended_until     TIMESTAMPTZ NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    responded           BOOLEAN DEFAULT false,
    response_message    TEXT,
    responded_at        TIMESTAMPTZ,
    permanently_locked  BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspensions_active ON suspensions(user_id, is_active) WHERE is_active = true;

-- =============================================================================
-- 19. SALES (Transitional — existing legacy table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sales (
    id                  SERIAL PRIMARY KEY,
    post_id             TEXT NOT NULL,
    buyer_id            TEXT NOT NULL,
    seller_id           TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested','approved','shipped','received','settled','fraud','rejected')),
    payment_mode        VARCHAR(10) NOT NULL DEFAULT 'IN_APP'
        CHECK (payment_mode IN ('IN_APP','OUTSIDE')),
    reported_party      TEXT,
    fraud_reason        TEXT,
    admin_notified      BOOLEAN DEFAULT false,
    agreed_price        DECIMAL(10,2),
    platform_fee        DECIMAL(10,2) DEFAULT 0,
    gst_on_fee          DECIMAL(10,2) DEFAULT 0,
    seller_payout       DECIMAL(10,2) DEFAULT 0,
    razorpay_hold       BOOLEAN DEFAULT false,
    currency            VARCHAR(3) DEFAULT 'INR',
    shipping_tracking   TEXT,
    shipping_courier    TEXT,
    shipping_evidence   JSONB DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In-app sale payment tracking (escrow): buyer pays via Razorpay, platform holds until receipt.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);

CREATE TABLE IF NOT EXISTS sale_payments (
    id                    BIGSERIAL PRIMARY KEY,
    sale_id               BIGINT NOT NULL UNIQUE,
    buyer_id              TEXT NOT NULL,
    seller_id             TEXT NOT NULL,
    post_id               TEXT,
    amount                DECIMAL(12,2) NOT NULL,
    currency              VARCHAR(10) DEFAULT 'INR',
    razorpay_order_id     VARCHAR(100),
    razorpay_payment_id   VARCHAR(100),
    razorpay_signature    VARCHAR(255),
    status                VARCHAR(30) DEFAULT 'ORDER_CREATED',
    paid_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_payments_order ON sale_payments(razorpay_order_id);

-- Allow posts to be frozen when a sale enters dispute/hold (fraud safety).
-- Widens the status CHECK to include 'frozen' plus statuses used by the app
-- (sale_pending, deleted, draft) so the constraint never blocks legitimate writes.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
    CHECK (status IN ('active','sold','bought','inactive','expired','undone','frozen','sale_pending','deleted','draft'));

-- =============================================================================
-- FINAL: Verify RLS is disabled (we handle auth at app level) & Run alterations
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_upi_id VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb;

-- All tables use application-level authorization, not PostgreSQL RLS.
-- This is intentional for our architecture.
