-- =====================================================
-- MHub - Buyer Inquiries Table
-- Version: 1.0
-- =====================================================

-- Create buyer_inquiries table for buyer-seller communication
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    buyer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_post ON buyer_inquiries(post_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_buyer ON buyer_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_status ON buyer_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_created ON buyer_inquiries(created_at DESC);

-- =====================================================
-- END
-- =====================================================
