const pool = require('../config/db');
const { logSecurityEvent, EVENTS } = require('../config/auditLogger');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function loadBcrypt() {
  try {
    // Preferred in tests where bcryptjs is mocked.
    return require('bcryptjs');
  } catch {
    return require('bcrypt');
  }
}

exports.exportUserData = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const normalizedUserId = String(userId);
    const userData = {};

    const userResult = await runQuery(
      `SELECT user_id, username, email, name, phone_number, role,
              preferred_language, rating, trust_score, created_at, last_login
       FROM users WHERE user_id = $1`,
      [normalizedUserId]
    );
    userData.profile = userResult.rows[0] || {};

    const profileResult = await runQuery(
      `SELECT full_name, phone, address, bio, created_at
       FROM profiles WHERE user_id = $1`,
      [normalizedUserId]
    );
    userData.extendedProfile = profileResult.rows[0] || {};

    const postsResult = await runQuery(
      `SELECT post_id, title, description, price, location, status, created_at
       FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [normalizedUserId]
    );
    userData.posts = postsResult.rows;

    const transactionsResult = await runQuery(
      `SELECT transaction_id, post_id, amount, status, created_at
       FROM transactions WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY created_at DESC`,
      [normalizedUserId]
    );
    userData.transactions = transactionsResult.rows;

    const wishlistResult = await runQuery(
      `SELECT post_id, created_at FROM wishlists WHERE user_id = $1`,
      [normalizedUserId]
    );
    userData.wishlist = wishlistResult.rows;

    const notificationsResult = await runQuery(
      `SELECT notification_id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [normalizedUserId]
    );
    userData.notifications = notificationsResult.rows;

    logSecurityEvent(EVENTS.DATA_EXPORT, {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mhub-data-export-${userId}-${Date.now()}.json"`);
    return res.json({
      exportDate: new Date().toISOString(),
      userId,
      data: userData
    });
  } catch (err) {
    logger.error('[GDPR] Export error:', err);
    return res.status(500).json({ error: 'Failed to export data' });
  }
};

exports.deleteUserData = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { password, confirmation } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ error: 'Please type "DELETE MY ACCOUNT" to confirm deletion' });
  }

  try {
    const bcrypt = loadBcrypt();
    const normalizedUserId = String(userId);

    const userResult = await runQuery('SELECT password_hash FROM users WHERE user_id = $1', [normalizedUserId]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await runQuery('DELETE FROM notifications WHERE user_id = $1', [normalizedUserId]);
    await runQuery('DELETE FROM wishlists WHERE user_id = $1', [normalizedUserId]);
    await runQuery('DELETE FROM transactions WHERE buyer_id = $1 OR seller_id = $1', [normalizedUserId]);
    await runQuery('DELETE FROM posts WHERE user_id = $1', [normalizedUserId]);
    await runQuery('DELETE FROM profiles WHERE user_id = $1', [normalizedUserId]);
    await runQuery('DELETE FROM users WHERE user_id = $1', [normalizedUserId]);

    logSecurityEvent(EVENTS.ACCOUNT_DELETED, {
      userId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    });
  } catch (err) {
    logger.error('[GDPR] Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
};
