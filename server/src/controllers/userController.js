const pool = require('../config/db');
const logger = require('../utils/logger');
const { getTierRules, getSubscriptionExpiry } = require('../config/tierRules');
const { getImageUrl } = require('../middleware/upload');
const { ensureUserTierColumns } = require('../services/schemaGuard');
const { processKycSubmission } = require('../services/kycAutomationService');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let profileColumnAvailabilityPromise = null;

const SUPPORTED_TIERS = new Set(['basic', 'silver', 'premium']);

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
  return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function enforceUserAccess(req, res, { allowQueryOverride = false } = {}) {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;

  if (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) {
    res.status(403).json({ error: 'Cannot access another user profile' });
    return null;
  }

  return authenticatedUserId;
}

async function getProfilesColumnAvailability() {
  if (!profileColumnAvailabilityPromise) {
    profileColumnAvailabilityPromise = runQuery(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name IN ('location', 'address', 'updated_at')
      `
    )
      .then((result) => {
        const names = new Set((result?.rows || []).map((row) => row.column_name));
        return {
          hasLocationColumn: names.has('location'),
          hasAddressColumn: names.has('address'),
          hasUpdatedAtColumn: names.has('updated_at')
        };
      })
      .catch((err) => {
        logger.warn('[Profile] Failed to inspect profiles columns, using safe defaults', { message: err.message });
        return {
          hasLocationColumn: false,
          hasAddressColumn: true,
          hasUpdatedAtColumn: false
        };
      });
  }

  return profileColumnAvailabilityPromise;
}

function getProfilesLocationSelectExpression(columnAvailability, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (columnAvailability.hasLocationColumn) {
    return `${prefix}location AS location`;
  }
  if (columnAvailability.hasAddressColumn) {
    return `${prefix}address AS location`;
  }
  return 'NULL::text AS location';
}

function getProfilesLocationColumnName(columnAvailability) {
  if (columnAvailability.hasLocationColumn) return 'location';
  if (columnAvailability.hasAddressColumn) return 'address';
  return null;
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * GET /api/users/profile
 * Get user's profile information
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    await ensureUserTierColumns();
    const profileColumnAvailability = await getProfilesColumnAvailability();

    const result = await runQuery(
      `
        SELECT
          u.user_id, u.email, u.tier, u.subscription_expiry, u.post_credits,
          p.full_name, p.bio, p.avatar_url, p.phone, ${getProfilesLocationSelectExpression(profileColumnAvailability, 'p')}, p.created_at,
          COALESCE(ps.active_posts, 0) AS active_posts,
          COALESCE(ps.sold_posts, 0) AS sold_posts
        FROM users u
        LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE status = 'active')::int AS active_posts,
            COUNT(*) FILTER (WHERE status = 'sold')::int AS sold_posts
          FROM posts
          WHERE user_id::text = u.user_id::text
        ) ps ON true
        WHERE u.user_id::text = $1
        LIMIT 1
      `,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      profile: result.rows[0]
    });
  } catch (err) {
    logger.error('[Profile] Get error:', err);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * PUT /api/users/profile
 * Update user's profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const profileColumnAvailability = await getProfilesColumnAvailability();
    const userId = getAuthenticatedUserId(req);
    const { full_name, bio, avatar_url, phone, location } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const locationColumn = getProfilesLocationColumnName(profileColumnAvailability);
    const locationValue = parseOptionalString(location);
    const insertColumns = ['user_id', 'full_name', 'bio', 'avatar_url', 'phone', 'created_at'];
    const insertValues = ['$1', '$2', '$3', '$4', '$5', 'NOW()'];
    const params = [
      userId,
      parseOptionalString(full_name) || 'User',
      parseOptionalString(bio),
      parseOptionalString(avatar_url),
      parseOptionalString(phone)
    ];

    if (locationColumn) {
      params.push(locationValue);
      insertColumns.push(locationColumn);
      insertValues.push(`$${params.length}`);
    }

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      insertColumns.push('updated_at');
      insertValues.push('NOW()');
    }

    const updateAssignments = [
      'full_name = COALESCE(EXCLUDED.full_name, profiles.full_name)',
      'bio = COALESCE(EXCLUDED.bio, profiles.bio)',
      'avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)',
      'phone = COALESCE(EXCLUDED.phone, profiles.phone)'
    ];

    if (locationColumn) {
      updateAssignments.push(`${locationColumn} = COALESCE(EXCLUDED.${locationColumn}, profiles.${locationColumn})`);
    }

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      updateAssignments.push('updated_at = NOW()');
    }

    const returningFields = [
      'profile_id',
      'user_id',
      'full_name',
      'bio',
      'avatar_url',
      'phone',
      getProfilesLocationSelectExpression(profileColumnAvailability),
      'created_at'
    ];

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      returningFields.push('updated_at');
    }

    const result = await runQuery(
      `
        INSERT INTO profiles (${insertColumns.join(', ')})
        VALUES (${insertValues.join(', ')})
        ON CONFLICT (user_id)
        DO UPDATE SET
          ${updateAssignments.join(', ')}
        RETURNING ${returningFields.join(', ')}
      `,
      params
    );

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[Profile] Updated for user ${userId}`);
    }

    return res.json({
      success: true,
      message: 'Profile updated',
      profile: result.rows[0]
    });
  } catch (err) {
    logger.error('[Profile] Update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * PROTOCOL: VALUE HIERARCHY - Tier Upgrade
 * POST /api/users/upgrade-tier
 *
 * In production: called after successful payment webhook
 * For MVP: simulates instant activation
 */
exports.upgradeTier = async (req, res) => {
  try {
    await ensureUserTierColumns();
    const userId = getAuthenticatedUserId(req);
    const tier = parseOptionalString(req.body.tier)?.toLowerCase();

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!tier || !SUPPORTED_TIERS.has(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be: basic, silver, or premium' });
    }

    const rules = getTierRules(tier);
    let expiresAt = null;
    let result;

    if (tier === 'basic') {
      result = await runQuery(
        `
          UPDATE users
          SET tier = 'basic',
              subscription_expiry = NULL,
              post_credits = COALESCE(post_credits, 0) + 1
          WHERE user_id::text = $1
          RETURNING user_id, tier, subscription_expiry, post_credits
        `,
        [userId]
      );
    } else {
      expiresAt = getSubscriptionExpiry(tier) || null;
      result = await runQuery(
        `
          UPDATE users
          SET tier = $1,
              subscription_expiry = $2
          WHERE user_id::text = $3
          RETURNING user_id, tier, subscription_expiry, post_credits
        `,
        [tier, expiresAt, userId]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[Tier] User ${userId} upgraded to ${tier.toUpperCase()}`);
    }

    try {
      const { sendRenewalSuccessNotification } = require('../services/subscriptionNotifications');
      if (tier !== 'basic') {
        await sendRenewalSuccessNotification(userId, tier, expiresAt);
      }
    } catch (notifErr) {
      logger.error('[Tier] Notification error (non-fatal):', notifErr.message);
    }

    return res.json({
      success: true,
      message: `Successfully activated ${tier.toUpperCase()} plan!`,
      user: result.rows[0],
      tier,
      features: rules.features,
      expiresAt
    });
  } catch (err) {
    logger.error('[Tier] Upgrade error:', err);
    return res.status(500).json({ error: 'Failed to upgrade tier' });
  }
};

/**
 * Get user's current tier status
 * GET /api/users/tier-status
 */
exports.getTierStatus = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    await ensureUserTierColumns();

    const result = await runQuery(
      `SELECT tier, subscription_expiry, post_credits FROM users WHERE user_id::text = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const tier = user.tier || 'basic';
    const rules = getTierRules(tier);

    let isActive = true;
    if (tier !== 'basic' && user.subscription_expiry) {
      isActive = new Date(user.subscription_expiry) > new Date();
    }

    return res.json({
      tier,
      tierName: rules.name,
      isActive,
      subscriptionExpiry: user.subscription_expiry,
      postCredits: user.post_credits || 0,
      features: rules.features,
      visibilityDays: rules.visibilityDays,
      dailyLimit: rules.dailyLimit,
      priority: rules.priority
    });
  } catch (err) {
    logger.error('[Tier] Status error:', err);
    return res.status(500).json({ error: 'Failed to get tier status' });
  }
};

/**
 * SUBMIT KYC
 * Securely receive ID proofs and update status
 */
exports.submitKYC = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const aadhaarNumber = parseOptionalString(req.body.aadhaar_number);
    const panNumber = parseOptionalString(req.body.pan_number);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!aadhaarNumber || !panNumber) {
      return res.status(400).json({ error: 'Aadhaar and PAN numbers are required' });
    }

    const files = req.files || {};
    const kycDocuments = {};

    if (files.kyc_front?.[0]) {
      kycDocuments.front = getImageUrl(files.kyc_front[0]);
    }

    if (files.kyc_back?.[0]) {
      kycDocuments.back = getImageUrl(files.kyc_back[0]);
    }

    if (!kycDocuments.front) {
      return res.status(400).json({ error: 'Front ID image is required' });
    }

    const result = await runQuery(
      `
        UPDATE users
        SET aadhaar_number = $1,
            pan_number = $2,
            kyc_documents = $3,
            aadhaar_status = 'PENDING',
            rejection_reason = NULL
        WHERE user_id::text = $4
        RETURNING aadhaar_status, kyc_documents
      `,
      [aadhaarNumber, panNumber, JSON.stringify(kycDocuments), userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const routingResult = await processKycSubmission({
      userId,
      aadhaarNumber,
      panNumber,
      documents: kycDocuments
    });

    return res.json({
      success: true,
      message:
        routingResult.decision === 'auto_approved'
          ? 'KYC submitted and auto-approved.'
          : routingResult.decision === 'auto_rejected'
            ? 'KYC submitted but auto-rejected. Please review issues and resubmit.'
            : 'KYC submitted successfully. Added to manual review queue.',
      status: routingResult.user_status || result.rows[0].aadhaar_status,
      routing: {
        queue_id: routingResult.queue_id,
        decision: routingResult.decision,
        decision_reason: routingResult.decision_reason,
        confidence: routingResult.confidence,
        risk_flags: routingResult.risk_flags,
        validation_errors: routingResult.validation_errors
      }
    });
  } catch (err) {
    logger.error('[KYC] Submission failed:', err);
    return res.status(500).json({ error: 'KYC Submission failed', details: err.message });
  }
};

function isUndefinedColumnError(error) {
  return Boolean(
    error
    && (
      error.code === '42703'
      || /column .* does not exist/i.test(String(error.message || ''))
    )
  );
}

async function getKycStatusRow(userId) {
  try {
    return await runQuery(
      `SELECT aadhaar_status, rejection_reason, aadhaar_number, pan_number, kyc_documents
       FROM users WHERE user_id::text = $1
       LIMIT 1`,
      [userId]
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      throw error;
    }

    logger.warn('[KYC] Falling back to schema-flex status query', {
      userId,
      message: error.message
    });

    return runQuery(
      `SELECT
         COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_status', ''), 'PENDING') AS aadhaar_status,
         NULLIF(to_jsonb(u)->>'rejection_reason', '') AS rejection_reason,
         NULLIF(to_jsonb(u)->>'aadhaar_number', '') AS aadhaar_number,
         NULLIF(to_jsonb(u)->>'pan_number', '') AS pan_number,
         COALESCE(to_jsonb(u)->'kyc_documents', '{}'::jsonb) AS kyc_documents
       FROM users u
       WHERE COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = $1
       LIMIT 1`,
      [userId]
    );
  }
}

exports.getKYCStatus = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await getKycStatusRow(userId);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = result.rows[0];
    const aadhaar = parseOptionalString(data.aadhaar_number);
    const pan = parseOptionalString(data.pan_number);
    const maskedAadhaar = aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : null;
    const maskedPan = pan ? `XXXXX${pan.slice(-4)}` : null;

    return res.json({
      status: parseOptionalString(data.aadhaar_status) || 'PENDING',
      rejection_reason: data.rejection_reason,
      aadhaar_number: maskedAadhaar,
      pan_number: maskedPan,
      documents: data.kyc_documents || {}
    });
  } catch (err) {
    logger.error('[KYC] Status fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
};
