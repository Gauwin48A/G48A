-- 02_functions.sql
-- This script creates the database functions for the application.

-- Function to validate a new post
CREATE OR REPLACE FUNCTION validate_add_post(
    p_user_id INT,
    p_category_id INT,
    p_tier_id INT,
    p_title VARCHAR,
    p_price NUMERIC,
    p_latitude NUMERIC,
    p_longitude NUMERIC
)
RETURNS TABLE(valid BOOLEAN, message TEXT, field TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not found.', 'user_id';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
        RETURN QUERY SELECT FALSE, 'Category not found.', 'category_id';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tiers WHERE tier_id = p_tier_id) THEN
        RETURN QUERY SELECT FALSE, 'Tier not found.', 'tier_id';
        RETURN;
    END IF;

    IF p_title IS NULL OR LENGTH(p_title) < 3 THEN
        RETURN QUERY SELECT FALSE, 'Title must be at least 3 characters long.', 'title';
        RETURN;
    END IF;

    IF p_price IS NULL OR p_price <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Price must be a positive number.', 'price';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Validation successful.', NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate a sale status transition
CREATE OR REPLACE FUNCTION validate_sale_transition(
    p_sale_id INT,
    p_new_status VARCHAR
)
RETURNS TABLE(valid BOOLEAN, message TEXT, field TEXT) AS $$
DECLARE
    current_status VARCHAR;
BEGIN
    SELECT sale_status INTO current_status FROM sales WHERE sale_id = p_sale_id;

    IF current_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Sale not found.', 'sale_id';
        RETURN;
    END IF;

    -- Example transition logic: a completed sale cannot be changed
    IF current_status = 'completed' THEN
        RETURN QUERY SELECT FALSE, 'Cannot change the status of a completed sale.', 'new_status';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Validation successful.', NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get post recommendations for a user
CREATE OR REPLACE FUNCTION get_recommendations(p_user_id INT)
RETURNS SETOF posts AS $$
BEGIN
    -- This is a simple recommendation logic. It can be expanded to include
    -- user preferences, location, and other factors.
    RETURN QUERY
    SELECT * FROM posts
    WHERE status = 'active' AND user_id != p_user_id
    ORDER BY created_at DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;