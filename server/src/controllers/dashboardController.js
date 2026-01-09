const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getDashboard = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    logger.warn('Dashboard request missing userId');
    return res.status(400).json({ code: 400, message: 'userId required' });
  }

  try {
    // Get user info
    const userResult = await pool.query(
      'SELECT user_id, username, email, rating, created_at FROM users WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ code: 404, message: 'User not found' });
    }

    const userData = userResult.rows[0];

    // Get user's posts counts
    const postsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_posts,
        COUNT(*) FILTER (WHERE status = 'sold') as sold_posts,
        COUNT(*) as total_posts,
        COALESCE(SUM(views_count), 0) as total_views
      FROM posts WHERE user_id = $1
    `, [userId]);

    const postsStats = postsResult.rows[0] || {};

    // Get recent activity (last 5 posts)
    const activityResult = await pool.query(`
      SELECT post_id, title, status, created_at, price
      FROM posts 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);

    // Get top sellers (for leaderboard)
    const topSellersResult = await pool.query(`
      SELECT u.user_id, u.username, u.rating,
        COUNT(p.post_id) FILTER (WHERE p.status = 'sold') as sales_count
      FROM users u
      LEFT JOIN posts p ON u.user_id = p.user_id
      GROUP BY u.user_id, u.username, u.rating
      ORDER BY sales_count DESC
      LIMIT 5
    `);

    // Format response
    const user = {
      id: userData.user_id,
      name: userData.username || 'User',
      email: userData.email,
      rating: parseFloat(userData.rating || 0).toFixed(1),
      rank: parseInt(postsStats.sold_posts || 0) >= 10 ? 'Gold Seller' :
        parseInt(postsStats.sold_posts || 0) >= 5 ? 'Silver Seller' : 'New Seller',
      coins: parseInt(postsStats.sold_posts || 0) * 10 + parseInt(postsStats.total_views || 0),
      dailyCode: `MH${String(userId).padStart(4, '0')}${new Date().getDate()}`
    };

    const quickStats = [
      {
        label: 'Active Listings',
        labelKey: 'active_listings',
        value: parseInt(postsStats.active_posts || 0),
        trend: '+Active',
        trendKey: 'trend_active',
        bg: 'bg-blue-100',
        color: 'text-blue-600'
      },
      {
        label: 'Total Sales',
        labelKey: 'total_sales',
        value: parseInt(postsStats.sold_posts || 0),
        trend: '+Sold',
        trendKey: 'trend_sold',
        bg: 'bg-green-100',
        color: 'text-green-600'
      },
      {
        label: 'Total Views',
        labelKey: 'total_views',
        value: parseInt(postsStats.total_views || 0),
        trend: '+Views',
        trendKey: 'trend_views',
        bg: 'bg-purple-100',
        color: 'text-purple-600'
      },
      {
        label: 'Coins Earned',
        labelKey: 'coins_earned',
        value: user.coins,
        trend: '+Coins',
        trendKey: 'trend_coins',
        bg: 'bg-yellow-100',
        color: 'text-yellow-600'
      }
    ];

    const recentActivity = activityResult.rows.map(post => ({
      id: post.post_id,
      title: post.title,
      time: new Date(post.created_at).toLocaleDateString(),
      status: post.status,
      price: post.price
    }));

    const topSellers = topSellersResult.rows.map((seller, index) => ({
      rank: index + 1,
      badge: ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index] || `${index + 1}`,
      name: seller.username || 'Seller',
      sales: parseInt(seller.sales_count || 0),
      coins: parseInt(seller.sales_count || 0) * 10,
      isCurrentUser: parseInt(seller.user_id) === parseInt(userId)
    }));

    res.json({
      user,
      quickStats,
      recentActivity,
      topSellers
    });

  } catch (err) {
    logger.error('Error fetching dashboard:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch dashboard', details: err.message });
  }
};
