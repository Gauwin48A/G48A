const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
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
         p.full_name, p.bio, p.avatar_url, p.phone,
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
 * POST /api/users/kyc – Submit KYC documents (Aadhaar + PAN) for
 * verification. Delegates to the KYC automation service for
 * auto-approve / auto-reject / manual-queue routing.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.submitKYC = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const aadhaarNumber = parseOptionalString(req.body.aadhaar_number);
    const panNumber = parseOptionalString(req.body.pan_number);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!aadhaarNumber || !panNumber) {
      return res
        .status(400)
        .json({ error: "Aadhaar and PAN numbers are required" });
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
      return res.status(400).json({ error: "Front ID image is required" });
    }

    const result = await runQuery(
      `UPDATE users
       SET aadhaar_number = $1,
           pan_number = $2,
           kyc_documents = $3,
           aadhaar_status = 'PENDING',
           rejection_reason = NULL
       WHERE user_id::text = $4
       RETURNING aadhaar_status, kyc_documents`,
      [aadhaarNumber, panNumber, JSON.stringify(kycDocuments), userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const routingResult = await processKycSubmission({
      userId,
      aadhaarNumber,
      panNumber,
      documents: kycDocuments,
    });

    return res.json({
      success: true,
      message:
        routingResult.decision === "auto_approved"
          ? "KYC submitted and auto-approved."
          : routingResult.decision === "auto_rejected"
            ? "KYC submitted but auto-rejected. Please review issues and resubmit."
            : "KYC submitted successfully. Added to manual review queue.",
      status: routingResult.user_status || result.rows[0].aadhaar_status,
      routing: {
        queue_id: routingResult.queue_id,
        decision: routingResult.decision,
        decision_reason: routingResult.decision_reason,
        confidence: routingResult.confidence,
        risk_flags: routingResult.risk_flags,
        validation_errors: routingResult.validation_errors,
      },
    });
  } catch (err) {
    logger.error("[KYC] Submission failed:", err);
    return res
      .status(500)
      .json({ error: "KYC Submission failed" });
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
 * Fetch the KYC status row for a user, gracefully falling back to a
 * schema-flex query when expected columns are missing.
 * @param {string} userId
 * @returns {Promise<pg.QueryResult>}
 */
async function getKycStatusRow(userId) {
  try {
    return await runQuery(
      `SELECT aadhaar_status, rejection_reason, aadhaar_number,
              pan_number, kyc_documents
       FROM users
       WHERE user_id::text = $1
       LIMIT 1`,
      [userId]
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      throw error;
    }

    logger.warn("[KYC] Falling back to schema-flex status query", {
      userId,
      message: error.message,
    });

    return runQuery(
      `SELECT
         COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_status', ''), 'PENDING') AS aadhaar_status,
         NULLIF(to_jsonb(u)->>'rejection_reason', '') AS rejection_reason,
         NULLIF(to_jsonb(u)->>'aadhaar_number', '') AS aadhaar_number,
         NULLIF(to_jsonb(u)->>'pan_number', '') AS pan_number,
         COALESCE(to_jsonb(u)->'kyc_documents', '{}'::jsonb) AS kyc_documents
       FROM users u
       WHERE COALESCE(
         NULLIF(to_jsonb(u)->>'user_id', ''),
         NULLIF(to_jsonb(u)->>'id', '')
       ) = $1
       LIMIT 1`,
      [userId]
    );
  }
}

/**
 * GET /api/users/kyc/status – Return the current KYC verification
 * status for the authenticated user. Sensitive ID numbers are masked.
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

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = result.rows[0];
    const aadhaar = parseOptionalString(data.aadhaar_number);
    const pan = parseOptionalString(data.pan_number);
    const maskedAadhaar = aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : null;
    const maskedPan = pan ? `XXXXX${pan.slice(-4)}` : null;

    return res.json({
      status: parseOptionalString(data.aadhaar_status) || "PENDING",
      rejection_reason: data.rejection_reason,
      aadhaar_number: maskedAadhaar,
      pan_number: maskedPan,
      documents: data.kyc_documents || {},
    });
  } catch (err) {
    logger.error("[KYC] Status fetch failed:", err);
    return res.status(500).json({ error: "Failed to fetch KYC status" });
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

    // Check for active transactions
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
    const anonEmail = `deleted_${userId}_${Date.now()}@deleted.mhub.local`;
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
