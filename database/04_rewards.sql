-- 04_rewards.sql
-- This script adds a rewards system to the database.

-- Rewards Table: Stores reward points for each user
CREATE TABLE rewards (
    reward_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reward Log Table: Logs rewards points awarded to users
CREATE TABLE reward_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to add reward points to a user
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

-- Trigger to award points when a user creates a new post
CREATE OR REPLACE FUNCTION award_post_creation_reward()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 10 points for each new post
    PERFORM add_reward_points(NEW.user_id, 10);

    -- Log the reward
    INSERT INTO reward_log (user_id, points, reason)
    VALUES (NEW.user_id, 10, 'post_creation');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_creation_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION award_post_creation_reward();

-- Seed initial reward points for existing users
INSERT INTO rewards (user_id, points)
SELECT user_id, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;
