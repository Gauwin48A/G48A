const { runQuery, getAuthUserId, pool } = require("../utils/dbHelpers");
const { parseOptionalString } = require("../utils/parseHelpers");
const { logSecurityEvent, EVENTS } = require('../config/auditLogger');
const logger = require('../utils/logger');

// Alias shared helper to match existing call sites
const getAuthenticatedUserId = getAuthUserId;

const GDPR_DELETE_TABLES = [
  { table: "auth_activity_log", columns: ["user_id"] },
  { table: "device_bindings", columns: ["user_id"] },
  { table: "device_analytics", columns: ["user_id"] },
  { table: "login_history", columns: ["user_id"] },
  { table: "login_audit", columns: ["user_id"] },
  { table: "audit", columns: ["user_id"] },
  { table: "audit_logs", columns: ["user_id"] },
  { table: "security_logs", columns: ["user_id"] },
  { table: "user_sessions", columns: ["user_id"] },
  { table: "webauthn_credentials", columns: ["user_id"] },
  { table: "otp_delivery_logs", columns: ["user_id"] },
  { table: "notification_preferences", columns: ["user_id"] },
  { table: "notifications", columns: ["user_id"] },
  { table: "preferences", columns: ["user_id"] },
  { table: "user_blocks", columns: ["blocker_id", "blocked_id"] },
  { table: "user_locations", columns: ["user_id"] },
  { table: "seller_locations", columns: ["user_id"] },
  { table: "user_location_events", columns: ["user_id"] },
  { table: "fraud_events", columns: ["user_id"] },
  { table: "risk_decision_events", columns: ["user_id"] },
  { table: "referrals", columns: ["referrer_id", "referee_id"] },
  { table: "referral_relationships", columns: ["referrer_user_id", "referee_user_id", "parent_user_id"] },
  { table: "referral_closure", columns: ["ancestor_user_id", "descendant_user_id"] },
  { table: "referral_rewards", columns: ["user_id", "referrer_user_id", "referee_user_id"] },
  { table: "rewards", columns: ["user_id"] },
  { table: "reward_log", columns: ["user_id"] },
  { table: "reward_activity", columns: ["user_id", "related_user_id"] },
  { table: "reward_daily_checkins", columns: ["user_id"] },
  { table: "reward_spin_history", columns: ["user_id"] },
  { table: "reward_scratch_claims", columns: ["user_id"] },
  { table: "reward_redemptions", columns: ["user_id"] },
  { table: "reward_idempotency", columns: ["user_id"] },
  { table: "coin_transactions", columns: ["user_id"] },
  { table: "user_streaks", columns: ["user_id"] },
  { table: "user_subscriptions", columns: ["user_id"] },
  { table: "payments", columns: ["user_id", "verified_by"] },
  { table: "posts", columns: ["user_id"] },
  { table: "post_boosts", columns: ["user_id"] },
  { table: "post_impressions", columns: ["viewer_user_id"] },
  { table: "post_likes", columns: ["user_id"] },
  { table: "post_reports", columns: ["reporter_id"] },
  { table: "post_drafts", columns: ["user_id"] },
  { table: "promoted_posts", columns: ["user_id"] },
  { table: "price_history", columns: ["changed_by"] },
  { table: "price_drop_alerts", columns: ["user_id"] },
  { table: "search_history", columns: ["user_id"] },
  { table: "wishlists", columns: ["user_id"] },
  { table: "recently_viewed", columns: ["user_id"] },
  { table: "saved_searches", columns: ["user_id"] },
  { table: "cart_items", columns: ["user_id"] },
  { table: "cart_promotions", columns: ["user_id"] },
  { table: "user_contacts", columns: ["owner_id", "matched_user_id"] },
  { table: "offers", columns: ["buyer_id", "seller_id"] },
  { table: "buyer_inquiries", columns: ["buyer_id", "seller_id"] },
  { table: "reviews", columns: ["reviewer_id", "reviewee_id"] },
  { table: "reports", columns: ["reporter_id", "reported_user_id", "resolved_by"] },
  { table: "complaints", columns: ["buyer_id", "seller_id", "resolved_by"] },
  { table: "channels", columns: ["owner_id"] },
  { table: "channel_admins", columns: ["user_id"] },
  { table: "channel_followers", columns: ["user_id"] },
  { table: "channel_posts", columns: ["owner_id"] },
  { table: "messages", columns: ["sender_id", "receiver_id"] },
  { table: "chats", columns: ["buyer_id", "seller_id", "user_id"] },
  { table: "chat_messages", columns: ["sender_id"] },
  { table: "aadhaar_verification_logs", columns: ["user_id"] },
  { table: "kyc_review_queue", columns: ["user_id", "reviewed_by"] },
  { table: "user_verifications", columns: ["user_id", "verified_by"] },
  { table: "admin_bulk_action_logs", columns: ["actor_user_id"] },
  { table: "admin_export_logs", columns: ["actor_user_id"] },
  { table: "admin_moderation_actions", columns: ["actor_user_id"] },
  { table: "transactions", columns: ["buyer_id", "seller_id", "user_id"] },
  { table: "profiles", columns: ["user_id"] },
];

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

    // ── Financial-activity guard (Phase 7, item 50): never hard-delete a
    //    user who has active escrow, pending payouts, open disputes, or a
    //    financial liability. Deactivation is the safe alternative. ──
    try {
      const { checkAccountFinancialExposure } = require('../services/accountFinancialGuardService');
      const exposure = await checkAccountFinancialExposure(normalizedUserId);
      if (exposure.blocked) {
        return res.status(409).json({
          error: 'Cannot permanently delete your account while financial activity is pending.',
          reasons: exposure.reasons,
          suggestion: 'Please DEACTIVATE your account instead (keeps financial history intact), or resolve the items above first.',
        });
      }
    } catch (guardErr) {
      logger.warn('[GDPR] Financial guard error (fail-open):', guardErr.message);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tableCache = new Map();
      const columnsCache = new Map();

      const tableExists = async (tableName) => {
        if (tableCache.has(tableName)) return tableCache.get(tableName);
        const result = await client.query("SELECT to_regclass($1) AS regclass", [tableName]);
        const exists = Boolean(result.rows?.[0]?.regclass);
        tableCache.set(tableName, exists);
        return exists;
      };

      const getColumnsForTable = async (tableName) => {
        if (columnsCache.has(tableName)) return columnsCache.get(tableName);
        const result = await client.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [tableName],
        );
        const columns = new Set(result.rows.map((row) => row.column_name));
        columnsCache.set(tableName, columns);
        return columns;
      };

      const deleteByColumns = async (tableName, candidateColumns) => {
        const qualifiedName = `public.${tableName}`;
        if (!(await tableExists(qualifiedName))) return;
        const existingColumns = await getColumnsForTable(tableName);
        const matchedColumns = candidateColumns.filter((column) => existingColumns.has(column));
        if (matchedColumns.length === 0) return;
        const conditions = matchedColumns.map((column) => `${column}::text = $1`);
        await client.query(
          `DELETE FROM ${tableName} WHERE ${conditions.join(" OR ")}`,
          [normalizedUserId],
        );
      };

      for (const entry of GDPR_DELETE_TABLES) {
        await deleteByColumns(entry.table, entry.columns);
      }

      await client.query('DELETE FROM users WHERE user_id::text = $1', [normalizedUserId]);
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
