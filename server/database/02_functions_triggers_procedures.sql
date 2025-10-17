-- 02_functions_triggers_procedures.sql
-- All functions, triggers, and stored procedures for the Mhub application

-- Function: Validate new post
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

-- Function: Validate sale status transition
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
    IF current_status = 'completed' THEN
        RETURN QUERY SELECT FALSE, 'Cannot change the status of a completed sale.', 'new_status';
        RETURN;
    END IF;
    RETURN QUERY SELECT TRUE, 'Validation successful.', NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Get post recommendations for a user
CREATE OR REPLACE FUNCTION get_recommendations(p_user_id INT)
RETURNS SETOF posts AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM posts
    WHERE status = 'active' AND user_id != p_user_id
    ORDER BY created_at DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate unique referral code
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

-- Function: Add reward points to a user
CREATE OR REPLACE FUNCTION add_reward_points(
    p_user_id INT,
    p_points INT
)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rewards WHERE user_id = p_user_id) THEN
        INSERT INTO rewards (user_id, points) VALUES (p_user_id, p_points);
    ELSE
        UPDATE rewards SET points = points + p_points, last_updated = CURRENT_TIMESTAMP WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Award points when a user creates a new post
CREATE OR REPLACE FUNCTION award_post_creation_reward()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM add_reward_points(NEW.user_id, 10);
    INSERT INTO reward_log (user_id, points, reason)
    VALUES (NEW.user_id, 10, 'post_creation');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_creation_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION award_post_creation_reward();

-- Audit Logging Trigger
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, details)
    VALUES (NEW.user_id, TG_OP, row_to_json(NEW)::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_user_insert
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION log_audit_action();
