const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getRewardsByUser = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Mock data for now - replace with actual database query
    const mockRewards = {
      totalCoins: 1250,
      dayStreak: 15,
      successfulRefs: 8,
      level: 'Gold',
      badges: ['Verified Seller', 'Top Referrer'],
      lastUpdated: new Date().toISOString()
    };

    res.json(mockRewards);
  } catch (err) {
    logger.error('getRewardsByUser error:', err);
    res.status(500).json({ error: 'Failed to fetch rewards' });
    logger.error('Failed to fetch rewards');
  }
};
