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

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
DECLARE
    code VARCHAR(10);
    is_unique BOOLEAN := FALSE;
BEGIN
    WHILE NOT is_unique LOOP
        code := (
            SELECT string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36 + 1)::int, 1), '')
            FROM generate_series(1, 8)
        );
        is_unique := NOT EXISTS (SELECT 1 FROM users WHERE referral_code = code);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle referral rewards
CREATE OR REPLACE FUNCTION process_referral_rewards()
RETURNS TRIGGER AS $$
DECLARE
    referrer_id INT;
    points_to_award INT := 100;
    current_level INT := 1;
BEGIN
    -- Assign a referral code to the new user
    NEW.referral_code := generate_referral_code();

    -- Award points up the referral chain
    referrer_id := NEW.referred_by;
    WHILE referrer_id IS NOT NULL AND current_level <= 5 LOOP
        -- Add points to the referrer
        PERFORM add_reward_points(referrer_id, points_to_award);

        -- Log the reward
        INSERT INTO reward_log (user_id, points, reason, related_user_id)
        VALUES (referrer_id, points_to_award, CASE WHEN current_level = 1 THEN 'direct_referral' ELSE 'indirect_referral' END, NEW.user_id);

        -- Get the next referrer in the chain
        SELECT referred_by INTO referrer_id FROM users WHERE user_id = referrer_id;

        -- Halve the points for the next level
        points_to_award := points_to_award / 2;
        current_level := current_level + 1;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_creation_trigger
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION process_referral_rewards();