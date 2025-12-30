const pool = require('../config/db');

// Default tiers if table doesn't exist
const defaultTiers = [
  { tier_id: 1, name: 'Free', price: 0, description: 'Basic listing with limited features', max_images: 1, color: 'gray-400', icon: 'FiDollarSign', tier_order: 1 },
  { tier_id: 2, name: 'Basic', price: 1.99, description: 'Standard listing with more visibility', max_images: 3, color: 'blue-400', icon: 'FiShield', tier_order: 2 },
  { tier_id: 3, name: 'Featured', price: 4.99, description: 'Prominent listing with enhanced features', max_images: 5, color: 'yellow-400', icon: 'FiStar', tier_order: 3 },
  { tier_id: 4, name: 'Premium', price: 9.99, description: 'Top-tier listing for maximum exposure', max_images: 10, color: 'purple-400', icon: 'FiCrown', tier_order: 4 }
];

exports.getTiers = async (req, res) => {
  try {
    // Try to get from database
    const result = await pool.query('SELECT * FROM tiers ORDER BY tier_order ASC');
    if (result.rows && result.rows.length > 0) {
      res.json(result.rows);
    } else {
      // Return defaults if no data in table
      res.json(defaultTiers);
    }
  } catch (err) {
    console.error('[Tiers] Error:', err.message);
    // Return defaults if table doesn't exist
    res.json(defaultTiers);
  }
};
