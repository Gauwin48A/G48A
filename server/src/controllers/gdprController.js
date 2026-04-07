const { runQuery, getAuthUserId, pool } = require("../utils/dbHelpers");
const { parseOptionalString } = require("../utils/parseHelpers");
const { logSecurityEvent, EVENTS } = require('../config/auditLogger');
const logger = require('../utils/logger');

// Alias shared helper to match existing call sites
const getAuthenticatedUserId = getAuthUserId;

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
       FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000`,
      [normalizedUserId]
    );
    userData.posts = postsResult.rows;

    const transactionsResult = await runQuery(
      `SELECT transaction_id, post_id, amount, status, created_at
       FROM transactions WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY created_at DESC LIMIT 1000`,
      [normalizedUserId]
    );
    userData.transactions = transactionsResult.rows;

    const wishlistResult = await runQuery(
      `SELECT post_id, created_at FROM wishlists WHERE user_id = $1 LIMIT 1000`,
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM notifications WHERE user_id = $1', [normalizedUserId]);
      await client.query('DELETE FROM wishlists WHERE user_id = $1', [normalizedUserId]);
      await client.query('DELETE FROM transactions WHERE buyer_id = $1 OR seller_id = $1', [normalizedUserId]);
      await client.query('DELETE FROM posts WHERE user_id = $1', [normalizedUserId]);
      await client.query('DELETE FROM profiles WHERE user_id = $1', [normalizedUserId]);
      await client.query('DELETE FROM users WHERE user_id = $1', [normalizedUserId]);
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

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

exports.deactivateUser = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { password, confirmation } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (confirmation !== 'DEACTIVATE MY ACCOUNT') {
    return res
      .status(400)
      .json({ error: 'Please type "DEACTIVATE MY ACCOUNT" to confirm deactivation' });
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

    await runQuery('UPDATE users SET is_active = false WHERE user_id = $1', [normalizedUserId]);

    try {
      await runQuery('UPDATE user_sessions SET is_active = false WHERE user_id = $1', [normalizedUserId]);
    } catch {
      // Ignore if session table is unavailable.
    }

    logSecurityEvent(EVENTS.ACCOUNT_DEACTIVATED, {
      userId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({
      success: true,
      message: 'Your account has been deactivated. Contact support to reactivate.'
    });
  } catch (err) {
    logger.error('[GDPR] Deactivate error:', err);
    return res.status(500).json({ error: 'Failed to deactivate account' });
  }
};
