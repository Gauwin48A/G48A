/**
 * Reward Controller
 * Manages reward points, redemption, and point history
 */
const pool = require('../config/db');

// GET /api/reward/my — Get my rewards summary
exports.getMyRewards = async (req, res) => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    try {
        const [rewardsRes, logRes] = await Promise.all([
            pool.query('SELECT * FROM rewards WHERE user_id = $1', [userId]),
            pool.query(
                'SELECT * FROM reward_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
                [userId]
            )
        ]);

        const rewards = rewardsRes.rows[0] || { points: 0, tier: 'Bronze' };
        const history = logRes.rows;

        res.json({
            points: rewards.points || 0,
            tier: rewards.tier || 'Bronze',
            history
        });
    } catch (err) {
        console.error('Get rewards error:', err);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};

// POST /api/reward/redeem — Redeem points for credits
exports.redeemRewards = async (req, res) => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { points } = req.body;
    if (!points || points <= 0) {
        return res.status(400).json({ error: 'Valid points amount required' });
    }

    try {
        // Check available balance
        const current = await pool.query('SELECT points FROM rewards WHERE user_id = $1', [userId]);
        const available = current.rows[0]?.points || 0;

        if (available < points) {
            return res.status(400).json({ error: `Insufficient points. Available: ${available}` });
        }

        // Deduct points
        await pool.query(
            'UPDATE rewards SET points = points - $1 WHERE user_id = $2',
            [points, userId]
        );

        // Log redemption
        await pool.query(`
      INSERT INTO reward_log (user_id, action, points, description, created_at)
      VALUES ($1, 'redemption', $2, 'Points redeemed for credits', NOW())
    `, [userId, -points]);

        // Add post credits (1 credit per 100 points)
        const credits = Math.floor(points / 100);
        if (credits > 0) {
            await pool.query(
                'UPDATE users SET post_credits = post_credits + $1 WHERE user_id = $2',
                [credits, userId]
            );
        }

        res.json({
            message: `Redeemed ${points} points for ${credits} post credits`,
            creditsGranted: credits,
            remainingPoints: available - points
        });
    } catch (err) {
        console.error('Redeem error:', err);
        res.status(500).json({ error: 'Failed to redeem rewards' });
    }
};
