-- =====================================================
-- BATCH 1 FEATURES: Reviews & Location Tables
-- =====================================================

-- Reviews table for ratings & reviews system
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    transaction_id INTEGER REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_review UNIQUE (reviewer_id, reviewee_id, post_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Location coordinates for posts (for radius-based search)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'latitude') THEN
        ALTER TABLE posts ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'longitude') THEN
        ALTER TABLE posts ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;

-- User location preferences
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'latitude') THEN
        ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'longitude') THEN
        ALTER TABLE users ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;

-- Add location coordinates to existing posts (major Indian cities)
UPDATE posts SET 
    latitude = CASE location
        WHEN 'Hyderabad' THEN 17.385044
        WHEN 'Mumbai' THEN 19.076090
        WHEN 'Delhi' THEN 28.704060
        WHEN 'Bangalore' THEN 12.971599
        WHEN 'Chennai' THEN 13.082680
        WHEN 'Kolkata' THEN 22.572645
        WHEN 'Pune' THEN 18.520430
        WHEN 'Ahmedabad' THEN 23.022505
        WHEN 'Jaipur' THEN 26.912434
        WHEN 'Kochi' THEN 9.931233
        ELSE 20.593684 -- India center
    END,
    longitude = CASE location
        WHEN 'Hyderabad' THEN 78.486671
        WHEN 'Mumbai' THEN 72.877426
        WHEN 'Delhi' THEN 77.102493
        WHEN 'Bangalore' THEN 77.594566
        WHEN 'Chennai' THEN 80.270721
        WHEN 'Kolkata' THEN 88.363892
        WHEN 'Pune' THEN 73.856743
        WHEN 'Ahmedabad' THEN 72.571365
        WHEN 'Jaipur' THEN 75.787270
        WHEN 'Kochi' THEN 76.267304
        ELSE 78.962883 -- India center
    END
WHERE latitude IS NULL;

-- Add sample reviews
INSERT INTO reviews (reviewer_id, reviewee_id, rating, title, comment, verified_purchase)
SELECT 
    r.reviewer_id,
    r.reviewee_id,
    r.rating,
    r.title,
    r.comment,
    r.verified_purchase
FROM (
    SELECT 
        (SELECT user_id FROM users ORDER BY user_id OFFSET 5 LIMIT 1) as reviewer_id,
        (SELECT user_id FROM users ORDER BY user_id LIMIT 1) as reviewee_id,
        5 as rating,
        'Excellent seller!' as title,
        'Fast delivery, product as described. Highly recommended!' as comment,
        true as verified_purchase
    UNION ALL
    SELECT 
        (SELECT user_id FROM users ORDER BY user_id OFFSET 6 LIMIT 1),
        (SELECT user_id FROM users ORDER BY user_id LIMIT 1),
        4,
        'Good experience',
        'Product was good, slight delay in shipping but overall satisfied.',
        true
    UNION ALL
    SELECT 
        (SELECT user_id FROM users ORDER BY user_id OFFSET 7 LIMIT 1),
        (SELECT user_id FROM users ORDER BY user_id OFFSET 1 LIMIT 1),
        5,
        'Amazing quality!',
        'Best purchase I made this year. Will buy again!',
        true
    UNION ALL
    SELECT 
        (SELECT user_id FROM users ORDER BY user_id OFFSET 8 LIMIT 1),
        (SELECT user_id FROM users ORDER BY user_id OFFSET 2 LIMIT 1),
        3,
        'Average',
        'Product is okay, not great but acceptable for the price.',
        false
) r
ON CONFLICT (reviewer_id, reviewee_id, post_id) DO NOTHING;

SELECT 'Reviews and location features added successfully' as status;
