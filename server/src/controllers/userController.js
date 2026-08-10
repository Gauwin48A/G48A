const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const pool = require("../config/db");
const { parseOptionalString } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const {
  getTierRules,
  getSubscriptionExpiry,
} = require("../config/tierRules");
const { getImageUrl } = require("../middleware/upload");
const { ensureUserTierColumns } = require("../services/schemaGuard");
const {
  processKycSubmission,
} = require("../services/kycAutomationService");
const kycService = require("../services/kycService");

let profileColumnAvailabilityPromise = null;

const SUPPORTED_TIERS = new Set(["basic", "bronze", "silver", "premium"]);

/**
 * Enforce that the request is authenticated and optionally allow a query
 * param override for the target user ID (only if it matches the caller).
 * Returns the resolved user ID or null (after sending an error response).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {{ allowQueryOverride?: boolean }} [options]
 * @returns {string|null}
 */
function enforceUserAccess(req, res, { allowQueryOverride = false } = {}) {
  const authenticatedUserId = getAuthUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;

  if (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) {
    res.status(403).json({ error: "Cannot access another user profile" });
    return null;
  }

  return authenticatedUserId;
}

/**
 * Discover which optional columns exist on the profiles table.
 * The result is cached after the first successful lookup so the
 * information_schema query only runs once per process lifetime.
 * Failures are NOT cached so a transient DB outage does not lock
 * the process into fallback defaults permanently.
 * @returns {Promise<{ hasLocationColumn: boolean, hasAddressColumn: boolean, hasUpdatedAtColumn: boolean }>}
 */
async function getProfilesColumnAvailability() {
  if (!profileColumnAvailabilityPromise) {
    profileColumnAvailabilityPromise = runQuery(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name IN ('location', 'address', 'updated_at')`
    )
      .then((result) => {
        const names = new Set(
          (result?.rows || []).map((row) => row.column_name)
        );
        return {
          hasLocationColumn: names.has("location"),
          hasAddressColumn: names.has("address"),
          hasUpdatedAtColumn: names.has("updated_at"),
        };
      })
      .catch((err) => {
        // Reset so the next call retries instead of caching failure defaults
        profileColumnAvailabilityPromise = null;
        logger.warn(
          "[Profile] Failed to inspect profiles columns, using safe defaults",
          { message: err.message }
        );
        return {
          hasLocationColumn: false,
          hasAddressColumn: true,
          hasUpdatedAtColumn: false,
        };
      });
  }
  return profileColumnAvailabilityPromise;
}

/**
 * Build a SQL SELECT expression that resolves the location column,
 * falling back to `address` or NULL depending on schema availability.
 * @param {{ hasLocationColumn: boolean, hasAddressColumn: boolean }} columnAvailability
 * @param {string} [tableAlias=""]
 * @returns {string}
 */
function getProfilesLocationSelectExpression(columnAvailability, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  if (columnAvailability.hasLocationColumn) {
    return `${prefix}location AS location`;
  }
  if (columnAvailability.hasAddressColumn) {
    return `${prefix}address AS location`;
  }
  return "NULL::text AS location";
}

/**
 * Return the actual column name used for location storage.
 * @param {{ hasLocationColumn: boolean, hasAddressColumn: boolean }} columnAvailability
 * @returns {string|null}
 */
function getProfilesLocationColumnName(columnAvailability) {
  if (columnAvailability.hasLocationColumn) return "location";
  if (columnAvailability.hasAddressColumn) return "address";
  return null;
}

/**
 * GET /api/users/profile – Retrieve the authenticated user's profile,
 * including tier information and post statistics.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    await ensureUserTierColumns();
    const profileColumnAvailability = await getProfilesColumnAvailability();

    const result = await runQuery(
      `SELECT
         u.user_id,
         u.email,
         COALESCE(NULLIF(u.current_plan, ''), NULLIF(u.tier, ''), 'basic') AS current_plan,
         COALESCE(NULLIF(u.current_plan, ''), NULLIF(u.tier, ''), 'basic') AS tier,
         u.subscription_expiry,
         u.post_credits,
         p.full_name, p.bio, p.avatar_url, p.phone, p.reward_badge,
         ${getProfilesLocationSelectExpression(profileColumnAvailability, "p")},
         p.created_at,
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
       LIMIT 1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ profile: result.rows[0] });
  } catch (err) {
    logger.error("[Profile] Get error:", err);
    return res.status(500).json({ error: "Failed to get profile" });
  }
};

/**
 * PUT /api/users/profile – Create or update the authenticated user's profile.
 * Uses an upsert (INSERT ... ON CONFLICT) so a profile row is created
 * automatically on first update.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.updateProfile = async (req, res) => {
  try {
    const profileColumnAvailability = await getProfilesColumnAvailability();
    const userId = getAuthUserId(req);
    const { full_name, bio, avatar_url, phone, location, search_radius } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Server-side length validation
    if (full_name && String(full_name).length > 100) {
      return res.status(400).json({ error: "Full name must be 100 characters or less" });
    }
    if (bio && String(bio).length > 500) {
      return res.status(400).json({ error: "Bio must be 500 characters or less" });
    }
    if (phone && !/^\+?\d{7,15}$/.test(String(phone).replace(/[\s-]/g, ""))) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Store search radius preference on users table (#72)
    if (search_radius !== undefined) {
      const radiusVal = Number(search_radius);
      if (Number.isFinite(radiusVal) && radiusVal >= 1 && radiusVal <= 500) {
        try {
          await runQuery(
            "UPDATE users SET search_radius = $1 WHERE user_id::text = $2",
            [radiusVal, userId]
          );
        } catch (_e) {
          // column may not exist yet — non-fatal
        }
      }
    }

    const locationColumn = getProfilesLocationColumnName(profileColumnAvailability);
    const locationValue = parseOptionalString(location);

    const insertColumns = [
      "user_id",
      "full_name",
      "bio",
      "avatar_url",
      "phone",
      "created_at",
    ];
    const insertValues = ["$1", "$2", "$3", "$4", "$5", "NOW()"];
    const params = [
      userId,
      parseOptionalString(full_name) || "User",
      parseOptionalString(bio),
      parseOptionalString(avatar_url),
      parseOptionalString(phone),
    ];

    if (locationColumn) {
      params.push(locationValue);
      insertColumns.push(locationColumn);
      insertValues.push(`$${params.length}`);
    }

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      insertColumns.push("updated_at");
      insertValues.push("NOW()");
    }

    const updateAssignments = [
      "full_name = COALESCE(EXCLUDED.full_name, profiles.full_name)",
      "bio = COALESCE(EXCLUDED.bio, profiles.bio)",
      "avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)",
      "phone = COALESCE(EXCLUDED.phone, profiles.phone)",
    ];

    if (locationColumn) {
      updateAssignments.push(
        `${locationColumn} = COALESCE(EXCLUDED.${locationColumn}, profiles.${locationColumn})`
      );
    }

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      updateAssignments.push("updated_at = NOW()");
    }

    const returningFields = [
      "profile_id",
      "user_id",
      "full_name",
      "bio",
      "avatar_url",
      "phone",
      getProfilesLocationSelectExpression(profileColumnAvailability),
      "created_at",
    ];

    if (profileColumnAvailability.hasUpdatedAtColumn) {
      returningFields.push("updated_at");
    }

    const result = await runQuery(
      `INSERT INTO profiles (${insertColumns.join(", ")})
       VALUES (${insertValues.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET
         ${updateAssignments.join(", ")}
       RETURNING ${returningFields.join(", ")}`,
      params
    );

    if (process.env.NODE_ENV !== "production") {
      logger.info(`[Profile] Updated for user ${userId}`);
    }

    return res.json({
      success: true,
      message: "Profile updated",
      profile: result.rows[0],
    });
  } catch (err) {
    logger.error("[Profile] Update error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

/**
 * POST /api/users/upgrade – Upgrade (or downgrade to basic) the
 * authenticated user's subscription tier.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.upgradeTier = async (req, res) => {
  try {
    await ensureUserTierColumns();
    const userId = getAuthUserId(req);
    const tier = parseOptionalString(req.body.tier)?.toLowerCase();

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!tier || !SUPPORTED_TIERS.has(tier)) {
      return res.status(400).json({
        error: "Invalid tier. Must be: basic, bronze, silver, or premium",
      });
    }

    const rules = getTierRules(tier);
    let expiresAt = null;
    let result;

    if (tier === "basic") {
      try {
        await runQuery(
          "UPDATE user_subscriptions SET is_active = false WHERE user_id = $1 AND is_active = true",
          [userId]
        );
      } catch (subErr) {
        // Subscription table may not exist yet – safe to ignore
      }

      result = await runQuery(
        `UPDATE users
         SET tier = 'basic',
             current_plan = 'basic',
             subscription_id = NULL,
             subscription_expiry = NULL,
             post_credits = COALESCE(post_credits, 0) + 1
         WHERE user_id::text = $1
         RETURNING user_id, tier, subscription_expiry, post_credits`,
        [userId]
      );
    } else {
      expiresAt = getSubscriptionExpiry(tier) || null;
      let subscriptionId = null;

      try {
        await runQuery(
          "UPDATE user_subscriptions SET is_active = false WHERE user_id = $1 AND is_active = true",
          [userId]
        );
        const subInsert = await runQuery(
          `INSERT INTO user_subscriptions (user_id, plan_name, expires_at, quota_reset_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id`,
          [userId, tier, expiresAt]
        );
        subscriptionId = subInsert.rows[0]?.id || null;
      } catch (subErr) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn(
            "[Tier] Subscription record update skipped:",
            subErr.message
          );
        }
      }

      result = await runQuery(
        `UPDATE users
         SET tier = $1,
             current_plan = $1,
             subscription_id = $2,
             subscription_expiry = $3
         WHERE user_id::text = $4
         RETURNING user_id, tier, subscription_expiry, post_credits`,
        [tier, subscriptionId, expiresAt, userId]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info(`[Tier] User ${userId} upgraded to ${tier.toUpperCase()}`);
    }

    try {
      const {
        sendRenewalSuccessNotification,
      } = require("../services/subscriptionNotifications");
      if (tier !== "basic") {
        await sendRenewalSuccessNotification(userId, tier, expiresAt);
      }
    } catch (notifErr) {
      logger.error("[Tier] Notification error (non-fatal):", notifErr.message);
    }

    return res.json({
      success: true,
      message: `Successfully activated ${tier.toUpperCase()} plan!`,
      user: result.rows[0],
      tier,
      features: rules.features,
      expiresAt,
    });
  } catch (err) {
    logger.error("[Tier] Upgrade error:", err);
    return res.status(500).json({ error: "Failed to upgrade tier" });
  }
};

/**
 * GET /api/users/tier – Return the current tier, expiry, credits,
 * and feature flags for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getTierStatus = async (req, res) => {
  try {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    if (!userId) return;

    await ensureUserTierColumns();

    const result = await runQuery(
      `SELECT current_plan, tier, subscription_expiry, post_credits
       FROM users
       WHERE user_id::text = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const tier = user.current_plan || user.tier || "basic";
    const rules = getTierRules(tier);

    let isActive = true;
    if (tier !== "basic") {
      const expiry = user.subscription_expiry
        ? new Date(user.subscription_expiry)
        : null;
      isActive = Boolean(
        expiry && !Number.isNaN(expiry.getTime()) && expiry > new Date(),
      );
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
      priority: rules.priority,
    });
  } catch (err) {
    logger.error("[Tier] Status error:", err);
    return res.status(500).json({ error: "Failed to get tier status" });
  }
};

/**
 * POST /api/users/kyc/pan
 * Verify PAN Number
 */
exports.verifyPan = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const panNumber = parseOptionalString(req.body.pan_number || req.body.panNumber);

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (!panNumber) return res.status(400).json({ error: "PAN number is required" });

    // 1. One-way hash PAN locally to verify if it has already been registered to another account
    const crypto = require("crypto");
    const normalizedPan = String(panNumber).trim().toUpperCase();
    if (normalizedPan.length !== 10) {
      return res.status(400).json({ error: "PAN number must be exactly 10 characters" });
    }

    const panHash = crypto.createHash("sha256").update(normalizedPan).digest("hex");

    // Check blacklist first
    const blacklistCheck = await runQuery(
      "SELECT reason FROM kyc_blacklist WHERE pan_hash = $1 LIMIT 1",
      [panHash]
    );
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({
        error: "This document is blacklisted due to verification violations: " + blacklistCheck.rows[0].reason
      });
    }

    const duplicateCheck = await runQuery(
      "SELECT user_id FROM kyc_verifications WHERE pan_hash = $1 AND status IN ('PAN_VERIFIED', 'VERIFIED') AND user_id::text != $2",
      [panHash, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "This PAN card is already verified with another account" });
    }

    // 2. Call Surepass to verify PAN
    const result = await kycService.verifyPan(userId, panNumber);

    if (result.verified) {
      await runQuery(
        `INSERT INTO kyc_verifications (user_id, pan_hash, pan_full_name, surepass_pan_ref_id, status)
         VALUES ($1, $2, $3, $4, 'PAN_VERIFIED')
         ON CONFLICT (user_id) DO UPDATE SET pan_hash = EXCLUDED.pan_hash, pan_full_name = EXCLUDED.pan_full_name, surepass_pan_ref_id = EXCLUDED.surepass_pan_ref_id, status = 'PAN_VERIFIED'`,
        [userId, result.panHash, result.name, result.refId]
      );
      await runQuery(`UPDATE users SET kyc_status = 'PAN_VERIFIED' WHERE user_id::text = $1`, [userId]);
      return res.json({ success: true, message: "PAN verified successfully", name: result.name });
    }

    return res.status(400).json({ error: result.error || "PAN verification failed" });
  } catch (err) {
    logger.error("[KYC] PAN verification failed:", err);
    return res.status(500).json({ error: "PAN Verification failed" });
  }
};

/**
 * POST /api/users/kyc/aadhaar/generate
 * Request Aadhaar OTP
 */
exports.generateAadhaarOtp = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const aadhaarNumber = parseOptionalString(req.body.aadhaar_number || req.body.aadhaarNumber);

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (!aadhaarNumber) return res.status(400).json({ error: "Aadhaar number is required" });

    // 1. One-way hash Aadhaar locally to verify if it has already been registered to another account
    const crypto = require("crypto");
    const parsedAadhaar = String(aadhaarNumber).replace(/\D/g, "");
    if (parsedAadhaar.length !== 12) {
      return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits" });
    }

    const aadhaarHash = crypto.createHash("sha256").update(parsedAadhaar).digest("hex");

    // Check blacklist first
    const blacklistCheck = await runQuery(
      "SELECT reason FROM kyc_blacklist WHERE aadhaar_hash = $1 LIMIT 1",
      [aadhaarHash]
    );
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({
        error: "This document is blacklisted due to verification violations: " + blacklistCheck.rows[0].reason
      });
    }

    const duplicateCheck = await runQuery(
      "SELECT user_id FROM kyc_verifications WHERE aadhaar_hash = $1 AND status = 'VERIFIED' AND user_id::text != $2",
      [aadhaarHash, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "This Aadhaar card is already verified with another account" });
    }

    // 2. Call Surepass to generate OTP
    const result = await kycService.sendAadhaarOtp(userId, aadhaarNumber);

    // 3. Cache the Aadhaar Hash and last 4 digits temporarily keyed by txnId (Valid for 15 minutes)
    const cacheService = require("../services/cacheService");
    const lastFour = parsedAadhaar.slice(-4);
    cacheService.set(`kyc:aadhaar:${result.txnId}`, { aadhaarHash, lastFour }, 900);

    return res.json({ success: true, txnId: result.txnId, masked: result.masked });
  } catch (err) {
    logger.error("[KYC] Aadhaar OTP generation failed:", err);
    return res.status(400).json({ error: err.message || "Failed to generate Aadhaar OTP" });
  }
};

/**
 * POST /api/users/kyc/aadhaar/verify
 * Verify Aadhaar OTP
 */
exports.verifyAadhaarOtp = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { otp, txnId, txn_id } = req.body;
    const resolvedTxnId = txnId || txn_id;

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (!otp || !resolvedTxnId) return res.status(400).json({ error: "OTP and txnId are required" });

    // 1. Retrieve the cached Aadhaar hash & last 4 digits
    const cacheService = require("../services/cacheService");
    const cachedData = cacheService.get(`kyc:aadhaar:${resolvedTxnId}`);

    // 2. Verify OTP with Surepass
    const result = await kycService.verifyAadhaarOtp(userId, otp, resolvedTxnId);

    if (result.verified) {
      const aadhaarHash = cachedData?.aadhaarHash || null;
      const lastFour = cachedData?.lastFour || null;

      // 3. Persist the record in kyc_verifications including hash and audit details
      await runQuery(
        `INSERT INTO kyc_verifications (user_id, status, aadhaar_hash, aadhaar_last_four, surepass_aadhaar_client_id, verified_at, updated_at)
         VALUES ($1, 'VERIFIED', $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET status = 'VERIFIED',
                       aadhaar_hash = COALESCE(EXCLUDED.aadhaar_hash, kyc_verifications.aadhaar_hash),
                       aadhaar_last_four = COALESCE(EXCLUDED.aadhaar_last_four, kyc_verifications.aadhaar_last_four),
                       surepass_aadhaar_client_id = EXCLUDED.surepass_aadhaar_client_id,
                       verified_at = NOW(),
                       updated_at = NOW()`,
        [userId, aadhaarHash, lastFour, resolvedTxnId]
      );

      await runQuery(`UPDATE users SET kyc_status = 'VERIFIED', kyc_verified = true WHERE user_id::text = $1`, [userId]);
      
      // Clean cache
      cacheService.del(`kyc:aadhaar:${resolvedTxnId}`);

      return res.json({
        success: true,
        message: "Aadhaar verified successfully",
        name: result.name,
        require_relogin: true,
        relogin_message: "KYC & Subscription verified! Logging out to activate full access..."
      });
    }

    return res.status(400).json({ error: result.error || "Aadhaar verification failed" });
  } catch (err) {
    logger.error("[KYC] Aadhaar verification failed:", err);
    return res.status(500).json({ error: "Aadhaar Verification failed" });
  }
};

/**
 * Check whether a Postgres error indicates an undefined column.
 * @param {Error & { code?: string }} error
 * @returns {boolean}
 */
function isUndefinedColumnError(error) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        /column .* does not exist/i.test(String(error.message || "")))
  );
}

/**
 * Fetch the KYC status row for a user from kyc_verifications
 */
async function getKycStatusRow(userId) {
  try {
    return await runQuery(
      `SELECT status, verified_at, pan_status
       FROM kyc_verifications
       WHERE user_id::text = $1
       LIMIT 1`,
      [userId]
    );
  } catch (error) {
    logger.warn("[KYC] Error fetching kyc status row", { userId, message: error.message });
    return { rows: [] };
  }
}

/**
 * GET /api/users/kyc/status – Return the current KYC verification
 * status for the authenticated user. Sensitive ID numbers are masked.
 *
 * Returns both `status` (web convention) and `kyc_status` (native app
 * convention) so both clients parse the same payload.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getKYCStatus = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await getKycStatusRow(userId);

    if (result.rows.length === 0) {
      return res.json({
        status: "NOT_SUBMITTED",
        kyc_status: "NOT_SUBMITTED",
        rejection_reason: null,
      });
    }

    const data = result.rows[0];
    const status = data.status || "PENDING";
    return res.json({
      status,
      kyc_status: status,
      verified_at: data.verified_at,
      pan_status: data.pan_status,
    });
  } catch (err) {
    logger.error("[KYC] Status fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch KYC status" });
  }
};

/**
 * POST /api/users/kyc/submit – Submit KYC documents for automated processing.
 *
 * Accepts BOTH payload shapes so the native app and web stay in sync:
 *   - App (JSON):  { docType, docNumber, docFrontKey, docBackKey, selfieKey }
 *   - Web (JSON):  { aadhaarNumber|aadhaar_number, panNumber|pan_number, documents:{front,back} }
 */
exports.submitKyc = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const body = req.body || {};
    const docType = parseOptionalString(body.docType)?.toLowerCase();
    const docNumber = parseOptionalString(body.docNumber) || "";

    let aadhaarNumber = parseOptionalString(body.aadhaarNumber || body.aadhaar_number);
    let panNumber = parseOptionalString(body.panNumber || body.pan_number);

    // App payload: docType routes the single doc number to the right slot.
    if (docType === "aadhaar") aadhaarNumber = docNumber;
    else if (docType === "pan") panNumber = docNumber;

    const documents = {
      front:
        parseOptionalString(body.docFrontKey) ||
        parseOptionalString(body.documents?.front),
      back:
        parseOptionalString(body.docBackKey) ||
        parseOptionalString(body.documents?.back),
      selfie: parseOptionalString(body.selfieKey),
    };

    const result = await processKycSubmission({
      userId,
      docType,
      aadhaarNumber,
      panNumber,
      documents,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error("[KYC] Submit KYC error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit KYC" });
  }
};

/**
 * POST /api/users/kyc/upload – Upload a KYC document image.
 * Returns the public URL + key so the app can pass it into /kyc/submit.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.uploadKycDoc = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const url = getImageUrl(file);
    if (!url) {
      return res.status(400).json({ error: "Upload failed: could not resolve file URL" });
    }

    return res.json({
      success: true,
      url,
      key: url,
      size: file.size || null,
    });
  } catch (err) {
    logger.error("[KYC] Upload error:", err);
    return res.status(500).json({ error: "Failed to upload document" });
  }
};

/**
 * DELETE /api/users/account – Self-service account deletion.
 * Deactivates the account and anonymizes PII (GDPR/DPDPA compliant).
 * Posts are soft-deleted, sessions are revoked.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.deleteAccount = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { password, confirmation } = req.body;
    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return res.status(400).json({
        error: "Please send confirmation: 'DELETE_MY_ACCOUNT' to proceed",
      });
    }

    // Verify password before deletion
    if (password) {
      const userRow = await client.query(
        "SELECT password_hash FROM users WHERE user_id::text = $1",
        [String(userId)]
      );
      if (userRow.rows.length > 0 && userRow.rows[0].password_hash) {
        const argon2 = require("argon2");
        const valid = await argon2.verify(userRow.rows[0].password_hash, password);
        if (!valid) {
          client.release();
          return res.status(401).json({ error: "Incorrect password" });
        }
      }
    }

    await client.query("BEGIN");

    // ── Financial-activity guard (Phase 7, item 50): refuse permanent
    //    deletion while escrow / payouts / disputes / balances are open ──
    try {
      const { checkAccountFinancialExposure } = require("../services/accountFinancialGuardService");
      const exposure = await checkAccountFinancialExposure(userId);
      if (exposure.blocked) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(409).json({
          error: "Cannot delete your account while financial activity is pending.",
          reasons: exposure.reasons,
          suggestion: "You can DEACTIVATE your account instead (keeps your financial history intact).",
        });
      }
    } catch (guardErr) {
      // Fail-open: if the guard service itself errors, fall through to legacy check
      logger.warn("[Account] Financial guard error (fail-open):", guardErr.message);
    }

    // Check for active transactions (legacy check — kept for backward compat)
    try {
      const activeTx = await client.query(
        `SELECT transaction_id FROM transactions
         WHERE (seller_id::text = $1 OR buyer_id::text = $1)
           AND status IN ('pending', 'in_progress', 'processing')
         LIMIT 1`,
        [String(userId)]
      );
      if (activeTx.rows.length > 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(409).json({
          error: "Cannot delete account while you have active transactions. Please resolve them first.",
        });
      }
    } catch (_txErr) {
      // transactions table may not exist
    }

    // Soft-delete all user posts
    await client.query(
      "UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE user_id::text = $1",
      [String(userId)]
    );

    // Anonymize profile
    await client.query(
      `UPDATE profiles SET
         full_name = 'Deleted User',
         bio = NULL,
         avatar_url = NULL,
         phone = NULL
       WHERE user_id::text = $1`,
      [String(userId)]
    );

    // Deactivate user + anonymize PII
    // Schema-safe: the live users table may lack is_active/name/phone_number
    // columns (they are added lazily by schemaGuard/admin bootstrap). Try the
    // full anonymization first, then fall back to the guaranteed-safe subset.
    const anonEmail = `deleted_${userId}_${Date.now()}@deleted.mhub.local`;
    try {
      await client.query(
        `UPDATE users SET
           is_active = false,
           email = $2,
           phone_number = NULL,
           name = 'Deleted User',
           username = $3,
           updated_at = NOW()
         WHERE user_id::text = $1`,
        [String(userId), anonEmail, `deleted_${userId}`]
      );
    } catch (deleteColErr) {
      if (!isUndefinedColumnError(deleteColErr)) {
        throw deleteColErr;
      }
      // Fallback: only update columns known to exist in the live schema
      await client.query(
        `UPDATE users SET
           email = $2,
           username = $3,
           updated_at = NOW()
         WHERE user_id::text = $1`,
        [String(userId), anonEmail, `deleted_${userId}`]
      );
    }

    // Revoke all sessions
    try {
      await client.query(
        "DELETE FROM user_sessions WHERE user_id::text = $1",
        [String(userId)]
      );
    } catch (_sessErr) {
      // user_sessions table may not exist
    }

    // Clean up follower relationships (#83)
    try {
      await client.query(
        "DELETE FROM followers WHERE follower_id::text = $1 OR followed_id::text = $1",
        [String(userId)]
      );
    } catch (_followErr) {
      // followers table may not exist
    }

    // Clean up notification preferences
    try {
      await client.query(
        "DELETE FROM notification_preferences WHERE user_id::text = $1",
        [String(userId)]
      );
    } catch (_npErr) {
      // table may not exist
    }

    // Clean up search history
    try {
      await client.query(
        "DELETE FROM search_history WHERE user_id::text = $1",
        [String(userId)]
      );
    } catch (_shErr) {
      // table may not exist
    }

    await client.query("COMMIT");

    // Clear auth cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    logger.info(`[Account] User ${userId} account deleted (self-service)`);
    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[Account] Deletion error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  } finally {
    client.release();
  }
};

/**
 * Update the user's preferred language.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.updatePreferredLanguage = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { language } = req.body || {};
    if (!language || typeof language !== "string") {
      return res.status(400).json({ error: "Language string is required" });
    }

    const normalizedLang = language.trim().toLowerCase().slice(0, 5);

    await runQuery(
      `UPDATE users
       SET preferred_language = $1, updated_at = NOW()
       WHERE user_id::text = $2`,
      [normalizedLang, String(userId)]
    );

    logger.info(`[User] Updated preferred language for user ${userId} to ${normalizedLang}`);
    return res.json({ success: true, preferred_language: normalizedLang });
  } catch (err) {
    logger.error("[User] Update preferred language error:", err);
    return res.status(500).json({ error: "Failed to update preferred language" });
  }
};
