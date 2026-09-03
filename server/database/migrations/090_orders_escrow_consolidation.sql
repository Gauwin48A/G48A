-- ============================================================================
-- Migration 090: Orders & Commercial Escrow Master Consolidation
-- ============================================================================

-- Ensure sequence for human-readable order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- Ensure orders table exists with core columns
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure all commercial, shipping, and escrow columns exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_on_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_payout DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS handover_otp VARCHAR(6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_line1 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_line2 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ensure order_items table exists
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE RESTRICT,
    seller_id INTEGER REFERENCES users(user_id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL
);

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_post ON orders(post_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_post ON order_items(post_id);
