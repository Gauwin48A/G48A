const { runQuery } = require("../utils/dbHelpers");
const { parseOptionalString } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { applyRewardDelta } = require("../services/rewardsLedgerService");
const { getTrustSnapshot } = require("../services/trustBadgeService");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILE_CACHE_TTL_SECONDS = 60;
const PREFERENCES_CACHE_TTL_SECONDS = 60;
const PROFILE_COMPLETION_BONUS_POINTS =
  Number.parseInt(process.env.PROFILE_COMPLETION_BONUS_POINTS, 10) || 50;

// ---------------------------------------------------------------------------
// Cached schema-introspection promises (run once per process lifetime)
// ---------------------------------------------------------------------------

let preferencesDateColumnAvailablePromise = null;
let profilesUpdatedAtColumnAvailablePromise = null;

/**
 * Check (once) whether the `preferences` table has a `date` column.
 * Falls back to using `created_at` if the column is missing.
 * @returns {Promise<boolean>}
 */
async function hasPreferencesDateColumn() {
  if (!preferencesDateColumnAvailablePromise) {
    preferencesDateColumnAvailablePromise = runQuery(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'preferences'
           AND column_name = 'date'
       ) AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn(
          "[Profile] Failed to inspect preferences.date column, using created_at fallback",
          { message: err.message }
        );
        return false;
      });
  }
  return preferencesDateColumnAvailablePromise;
}

/**
 * Check (once) whether the `profiles` table has an `updated_at` column.
 * @returns {Promise<boolean>}
 */
async function hasProfilesUpdatedAtColumn() {
  if (!profilesUpdatedAtColumnAvailablePromise) {
    profilesUpdatedAtColumnAvailablePromise = runQuery(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'profiles'
           AND column_name = 'updated_at'
       ) AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn(
          "[Profile] Failed to inspect profiles.updated_at column, using compatibility query",
          { message: err.message }
        );
        return false;
      });
  }
  return profilesUpdatedAtColumnAvailablePromise;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Detect the specific ON CONFLICT constraint error from PostgreSQL.
 * @param {Error} error
 * @returns {boolean}
 */
function isOnConflictConstraintError(error) {
  return Boolean(
    error &&
      (error.code === "42P10" ||
        /no unique or exclusion constraint matching the on conflict specification/i.test(
          String(error.message || "")
        ))
  );
}

/**
 * Build the SELECT expression for the preferences `date` column,
 * falling back to `created_at AS date` when the column is absent.
 * @param {boolean} hasDateColumn
 * @param {string} [tableAlias=""]
 * @returns {string}
 */
function getPreferencesDateSelectExpression(hasDateColumn, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return hasDateColumn ? `${prefix}date` : `${prefix}created_at AS date`;
}

/**
 * Unwrap a value that may be an array (e.g. repeated query-string keys).
 * @param {*} value
 * @returns {*}
 */
function getScalarValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parse a numeric value, returning the number or null.
 * @param {*} value
 * @returns {number|null}
 */
function parseOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse a loose boolean value that may arrive as a native boolean,
 * number, or string-like database payload.
 * @param {*} value
 * @returns {boolean}
 */
function parseLooseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Normalise a user-ID value that may arrive as an array or padded string.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeUserId(value) {
  const scalar = getScalarValue(value);
  return parseOptionalString(scalar);
}

/**
 * Extract the authenticated user ID from the request object.
 * Handles the various property names different auth middleware may set.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function getAuthenticatedUserId(req) {
  return normalizeUserId(req.user?.userId ?? req.user?.id ?? req.user?.user_id);
}

/**
 * Loose equality check for two user IDs (string comparison).
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
function idsEqual(left, right) {
  if (!left || !right) return false;
  return String(left) === String(right);
}

/**
 * Verify the requesting user is the same as the target user.
 * Sends an error response and returns `false` when the check fails.
 * @param {string} requestedUserId
 * @param {string} authenticatedUserId
 * @param {import("express").Response} res
 * @returns {boolean}
 */
function requireSameUser(requestedUserId, authenticatedUserId, res) {
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (!idsEqual(requestedUserId, authenticatedUserId)) {
    logger.warn(
      `SECURITY: IDOR attempt - User ${authenticatedUserId} tried to access/modify user ${requestedUserId}`
    );
    res.status(403).json({ error: "You cannot access another user's data", code: "FORBIDDEN" });
    return false;
  }
  return true;
}

/**
 * Determine whether a profile object has all required fields populated.
 * @param {object} profile
 * @returns {boolean}
 */
function isProfileComplete(profile) {
  if (!profile) return false;
  const required = [profile.full_name, profile.phone, profile.address, profile.avatar_url];
  return required.every((value) => {
    const normalized = String(value || "").trim();
    return normalized.length > 0;
  });
}

// ---------------------------------------------------------------------------
// Cache-key builders
// ---------------------------------------------------------------------------

function buildProfileCacheKey(userId) {
  return `profile:${userId}:detail`;
}

function buildPreferencesCacheKey(userId) {
  return `profile:${userId}:preferences`;
}

function invalidateProfileCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`profile:${userId}:*`);
}

// ---------------------------------------------------------------------------
// Exported route handlers
// ---------------------------------------------------------------------------

/**
 * GET /profile
 *
 * Fetch the authenticated user's profile (or another user's profile if the
 * caller is the same user). Auto-creates a skeleton profile row when one does
 * not yet exist.
 *
 * Query params:
 *   - userId   (optional) – defaults to the authenticated user
 *   - refresh  (optional) – "true" to bypass cache
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.query.userId ?? authenticatedUserId);
    const isDemo = Boolean(req.user?.is_demo);
    const hasUpdatedAtColumn = await hasProfilesUpdatedAtColumn();

    if (!requestedUserId) {
      logger.warn("Profile request missing userId");
      return res.status(400).json({ code: 400, message: "userId required", fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    // ── Demo / non-DB user fallback ──────────────────────────────
    if (isDemo) {
      const demoProfile = {
        user_id: requestedUserId,
        full_name: req.user?.name || "Demo User",
        name: req.user?.name || "Demo User",
        phone: "+91-9876543210",
        address: "Hyderabad, India",
        avatar_url: "",
        bio: "This is a demo account for preview purposes.",
        verified: true,
        email_verified: true,
        phone_verified: true,
        kyc_verified: true,
        email: "demo@mhub.app",
        role: "user",
        tier: "premium",
        current_plan: "premium",
        subscription_expiry: null,
        post_credits: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trust: {
          score: 100,
          level: "gold",
          label: "Trusted Seller",
          risk_state: null,
          under_review: false,
        },
        risk_state: null,
        under_review: false,
      };
      return res.json(demoProfile);
    }

    const cacheKey = buildProfileCacheKey(requestedUserId);
    if (req.query.refresh === "true") {
      cacheService.del(cacheKey);
    }

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT
             u.user_id,
             u.name AS user_name,
             u.username,
             u.email,
             u.role,
             u.created_at,
             NULLIF(to_jsonb(u)->>'tier', '') AS tier,
             NULLIF(to_jsonb(u)->>'current_plan', '') AS current_plan,
             NULLIF(to_jsonb(u)->>'subscription_expiry', '') AS subscription_expiry,
             NULLIF(to_jsonb(u)->>'post_credits', '') AS post_credits,
             CASE
               WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'email_verified', ''), 'false')) IN ('true', '1', 'yes')
                 THEN TRUE
               ELSE FALSE
             END AS email_verified,
             CASE
               WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'phone_verified', ''), 'false')) IN ('true', '1', 'yes')
                 THEN TRUE
               ELSE FALSE
             END AS phone_verified,
             CASE
               WHEN LOWER(
                 COALESCE(
                   NULLIF(to_jsonb(u)->>'kyc_verified', ''),
                   NULLIF(to_jsonb(u)->>'verified', ''),
                   'false'
                 )
               ) IN ('true', '1', 'yes')
                 THEN TRUE
               ELSE FALSE
             END AS kyc_verified,
             p.profile_id,
             p.full_name,
             p.phone,
             p.address,
             p.avatar_url,
             p.bio,
             ${hasUpdatedAtColumn ? "p.updated_at," : "NULL::timestamptz AS updated_at,"}
             COALESCE(p.verified, false) AS verified,
             p.payout_upi_id,
             p.payout_bank_details
           FROM users u
           LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
           WHERE u.user_id::text = $1
           LIMIT 1`,
          [requestedUserId]
        );

        if (!result.rows?.length) {
          return null;
        }

        const row = result.rows[0];

        // Auto-create a skeleton profile if none exists yet
        if (!row.profile_id) {
          await runQuery(
            `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified)
             VALUES ($1, $2, $3, $4, $5, $6, false)
             ON CONFLICT (user_id) DO NOTHING`,
            [requestedUserId, row.user_name || row.username || "User", null, null, null, null]
          );
        }

        const displayName = row.full_name || row.user_name || row.username || "User";

        const resolvedPlan =
          parseOptionalString(row.current_plan) ||
          parseOptionalString(row.tier) ||
          "basic";
        const trustSnapshot = await getTrustSnapshot(requestedUserId);

        return {
          user_id: row.user_id,
          full_name: displayName,
          name: displayName,
          phone: row.phone || "",
          address: row.address || "",
          avatar_url: row.avatar_url || "",
          bio: row.bio || "",
          verified: Boolean(row.verified),
          email_verified: parseLooseBoolean(row.email_verified),
          phone_verified: parseLooseBoolean(row.phone_verified),
          kyc_verified: parseLooseBoolean(row.kyc_verified) || Boolean(row.verified),
          email: row.email || "",
          role: row.role || "user",
          tier: resolvedPlan,
          current_plan: resolvedPlan,
          subscription_expiry: parseOptionalString(row.subscription_expiry),
          post_credits: parseOptionalNumber(row.post_credits) || 0,
          payout_upi_id: row.payout_upi_id || "",
          payout_bank_details: row.payout_bank_details || {},
          created_at: row.created_at,
          updated_at: row.updated_at || null,
          trust: trustSnapshot,
          risk_state: trustSnapshot?.risk_state || null,
          under_review: trustSnapshot?.under_review ?? false,
        };
      },
      PROFILE_CACHE_TTL_SECONDS
    );

    if (!payload) {
      logger.error("User not found for profile request:", requestedUserId);
      return res.status(404).json({ code: 404, message: "User not found", fallback: null });
    }

    return res.json(payload);
  } catch (err) {
    logger.error("Error fetching profile:", err);
    return res.status(500).json({
      code: 500,
      message: "Failed to fetch profile",
      details: "Internal server error",
      fallback: null,
    });
  }
};

/**
 * PUT /profile
 *
 * Create or update the authenticated user's profile. Awards a one-time
 * completion bonus when all required fields are populated.
 *
 * Body params: userId, full_name, phone, address, avatar_url, bio
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.updateProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);
    const { full_name, phone, address, avatar_url, bio, payout_upi_id, payout_bank_details } = req.body;
    const hasUpdatedAtColumn = await hasProfilesUpdatedAtColumn();

    if (!requestedUserId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const normalizedFullName =
      parseOptionalString(full_name) ||
      parseOptionalString(req.user?.name) ||
      parseOptionalString(req.user?.username) ||
      "User";

    // Security validation for payout UPI ID format
    let sanitizedUpiId = parseOptionalString(payout_upi_id);
    if (sanitizedUpiId) {
      sanitizedUpiId = sanitizedUpiId.trim();
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
      if (!upiRegex.test(sanitizedUpiId)) {
        return res.status(400).json({ error: "Invalid UPI ID format. Expected format: username@bank (e.g. name@upi)" });
      }
    }

    const queryParams = [
      requestedUserId,
      normalizedFullName,
      parseOptionalString(phone),
      parseOptionalString(address),
      parseOptionalString(avatar_url),
      parseOptionalString(bio),
      sanitizedUpiId,
      payout_bank_details ? (typeof payout_bank_details === "string" ? payout_bank_details : JSON.stringify(payout_bank_details)) : null,
    ];

    const returningFields = hasUpdatedAtColumn
      ? `profile_id, user_id, full_name, phone, address,
             avatar_url, bio, verified, created_at, updated_at, payout_upi_id, payout_bank_details`
      : `profile_id, user_id, full_name, phone, address,
             avatar_url, bio, verified, created_at, payout_upi_id, payout_bank_details`;

    let result;

    try {
      result = await runQuery(
        hasUpdatedAtColumn
          ? `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, payout_upi_id, payout_bank_details, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (user_id) DO UPDATE
             SET full_name   = COALESCE(EXCLUDED.full_name,   profiles.full_name),
                 phone       = COALESCE(EXCLUDED.phone,       profiles.phone),
                 address     = COALESCE(EXCLUDED.address,     profiles.address),
                 avatar_url  = COALESCE(EXCLUDED.avatar_url,  profiles.avatar_url),
                 bio         = COALESCE(EXCLUDED.bio,         profiles.bio),
                 payout_upi_id = COALESCE(EXCLUDED.payout_upi_id, profiles.payout_upi_id),
                 payout_bank_details = COALESCE(EXCLUDED.payout_bank_details, profiles.payout_bank_details),
                 updated_at  = NOW()
             RETURNING ${returningFields}`
          : `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, payout_upi_id, payout_bank_details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id) DO UPDATE
             SET full_name   = COALESCE(EXCLUDED.full_name,   profiles.full_name),
                 phone       = COALESCE(EXCLUDED.phone,       profiles.phone),
                 address     = COALESCE(EXCLUDED.address,     profiles.address),
                 avatar_url  = COALESCE(EXCLUDED.avatar_url,  profiles.avatar_url),
                 bio         = COALESCE(EXCLUDED.bio,         profiles.bio),
                 payout_upi_id = COALESCE(EXCLUDED.payout_upi_id, profiles.payout_upi_id),
                 payout_bank_details = COALESCE(EXCLUDED.payout_bank_details, profiles.payout_bank_details)
             RETURNING ${returningFields}`,
        queryParams
      );
    } catch (upsertError) {
      // -----------------------------------------------------------------
      // Compatibility path: if the `user_id` unique constraint is missing
      // fall back to UPDATE then INSERT.
      // -----------------------------------------------------------------
      if (!isOnConflictConstraintError(upsertError)) {
        throw upsertError;
      }

      logger.warn(
        "[Profile] profiles.user_id unique constraint missing; using update/insert compatibility path",
        { message: upsertError.message }
      );

      const updateResult = await runQuery(
        hasUpdatedAtColumn
          ? `UPDATE profiles
             SET full_name   = COALESCE($2, full_name),
                 phone       = COALESCE($3, phone),
                 address     = COALESCE($4, address),
                 avatar_url  = COALESCE($5, avatar_url),
                 bio         = COALESCE($6, bio),
                 payout_upi_id = COALESCE($7, payout_upi_id),
                 payout_bank_details = COALESCE($8, payout_bank_details),
                 updated_at  = NOW()
             WHERE user_id::text = $1
             RETURNING ${returningFields}`
          : `UPDATE profiles
             SET full_name   = COALESCE($2, full_name),
                 phone       = COALESCE($3, phone),
                 address     = COALESCE($4, address),
                 avatar_url  = COALESCE($5, avatar_url),
                 bio         = COALESCE($6, bio),
                 payout_upi_id = COALESCE($7, payout_upi_id),
                 payout_bank_details = COALESCE($8, payout_bank_details)
             WHERE user_id::text = $1
             RETURNING ${returningFields}`,
        queryParams
      );

      if (updateResult.rows?.length) {
        result = updateResult;
      } else {
        try {
          result = await runQuery(
            hasUpdatedAtColumn
              ? `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, payout_upi_id, payout_bank_details, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                 RETURNING ${returningFields}`
              : `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, payout_upi_id, payout_bank_details)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING ${returningFields}`,
            queryParams
          );
        } catch (insertError) {
          // Race-condition: another request inserted between our UPDATE and INSERT
          if (String(insertError?.code || "") === "23505") {
            result = await runQuery(
              hasUpdatedAtColumn
                ? `UPDATE profiles
                   SET full_name   = COALESCE($2, full_name),
                       phone       = COALESCE($3, phone),
                       address     = COALESCE($4, address),
                       avatar_url  = COALESCE($5, avatar_url),
                       bio         = COALESCE($6, bio),
                       payout_upi_id = COALESCE($7, payout_upi_id),
                       payout_bank_details = COALESCE($8, payout_bank_details),
                       updated_at  = NOW()
                   WHERE user_id::text = $1
                   RETURNING ${returningFields}`
                : `UPDATE profiles
                   SET full_name   = COALESCE($2, full_name),
                       phone       = COALESCE($3, phone),
                       address     = COALESCE($4, address),
                       avatar_url  = COALESCE($5, avatar_url),
                       bio         = COALESCE($6, bio),
                       payout_upi_id = COALESCE($7, payout_upi_id),
                       payout_bank_details = COALESCE($8, payout_bank_details)
                   WHERE user_id::text = $1
                   RETURNING ${returningFields}`,
              queryParams
            );
          } else {
            throw insertError;
          }
        }
      }
    }

    if (!result.rows?.length) {
      logger.error("Profile upsert returned no rows for user:", requestedUserId);
      return res.status(500).json({ error: "Failed to update profile", fallback: null });
    }

    const payload = result.rows[0];

    if (!hasUpdatedAtColumn) {
      payload.updated_at = payload.updated_at || null;
    }

    // Award a one-time profile-completion bonus
    if (isProfileComplete(payload) && PROFILE_COMPLETION_BONUS_POINTS > 0) {
      applyRewardDelta({
        userId: requestedUserId,
        pointsDelta: PROFILE_COMPLETION_BONUS_POINTS,
        action: "profile_completed",
        description: "Bonus for completing your profile",
        idempotencyKey: `profile:complete:${requestedUserId}`,
      }).catch((err) => {
        logger.warn("[Profile] Profile completion bonus skipped", { message: err.message });
      });
    }

    invalidateProfileCache(requestedUserId);
    return res.json(payload);
  } catch (err) {
    logger.error("Error updating profile:", err);
    return res.status(500).json({ error: "Failed to update profile", fallback: null });
  }
};

/**
 * GET /preferences
 *
 * Fetch the authenticated user's marketplace preferences (location, price
 * range, subcategories, notification flag). Returns sensible defaults when no
 * row exists yet.
 *
 * Query params:
 *   - userId   (optional) – defaults to the authenticated user
 *   - refresh  (optional) – "true" to bypass cache
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getPreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.query.userId ?? authenticatedUserId);
    const hasDateColumn = await hasPreferencesDateColumn();

    if (!requestedUserId) {
      logger.warn("Preferences request missing userId");
      return res.status(400).json({ code: 400, message: "userId required", fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const cacheKey = buildPreferencesCacheKey(requestedUserId);
    if (req.query.refresh === "true") {
      cacheService.del(cacheKey);
    }

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT
             user_id,
             location,
             min_price,
             max_price,
             categories,
             ${getPreferencesDateSelectExpression(hasDateColumn)},
             notification_enabled
           FROM preferences
           WHERE user_id::text = $1
           LIMIT 1`,
          [requestedUserId]
        );

        if (!result.rows?.length) {
          logger.info("No preferences found for user, returning defaults:", requestedUserId);
          return {
            userId: requestedUserId,
            location: "",
            minPrice: 0,
            maxPrice: 1e5,
            categories: [],
            subcategories: [],
            date: null,
          };
        }

        const pref = result.rows[0];
        return {
          userId: pref.user_id,
          location: pref.location || "",
          minPrice: parseOptionalNumber(pref.min_price) || 0,
          maxPrice: parseOptionalNumber(pref.max_price) || 1e5,
          categories: pref.categories || [],
          subcategories: pref.categories || [],
          date: pref.date || null,
          notificationEnabled: pref.notification_enabled,
        };
      },
      PREFERENCES_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (err) {
    logger.error("Error fetching preferences:", err);
    return res.status(500).json({
      code: 500,
      message: "Failed to fetch preferences",
      fallback: null,
    });
  }
};

/**
 * PUT /preferences
 *
 * Create or update the authenticated user's marketplace preferences.
 * Automatically swaps min/max price when they are inverted.
 *
 * Body params: userId, location, minPrice, maxPrice, subcategories
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.updatePreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);
    const { location, categories, subcategories } = req.body;
    const hasDateColumn = await hasPreferencesDateColumn();

    if (!requestedUserId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    let minPrice = parseOptionalNumber(req.body.minPrice);
    let maxPrice = parseOptionalNumber(req.body.maxPrice);
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 1e5;
    if (minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }

    const normalizedPreferenceItems = Array.isArray(subcategories)
      ? subcategories
      : Array.isArray(categories)
        ? categories
        : [];
    const categoriesJson = JSON.stringify(normalizedPreferenceItems);

    logger.info("Saving preferences for user:", requestedUserId, {
      location,
      minPrice,
      maxPrice,
      subcategories: categoriesJson,
    });

    const result = await runQuery(
      `INSERT INTO preferences (user_id, location, min_price, max_price, categories)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id)
       DO UPDATE SET location = $2, min_price = $3, max_price = $4, categories = $5::jsonb
       RETURNING
         user_id,
         location,
         min_price,
         max_price,
         categories,
         ${getPreferencesDateSelectExpression(hasDateColumn)},
         notification_enabled`,
      [requestedUserId, parseOptionalString(location) || "", minPrice, maxPrice, categoriesJson]
    );

    if (!result.rows?.length) {
      return res.status(404).json({ error: "Failed to save preferences" });
    }

    logger.info("Preferences saved successfully for user:", requestedUserId);
    invalidateProfileCache(requestedUserId);
    const savedPreference = result.rows[0] || {};
    return res.json({
      ...savedPreference,
      subcategories: Array.isArray(savedPreference.categories)
        ? savedPreference.categories
        : [],
    });
  } catch (err) {
    logger.error("Error updating preferences:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /profile/avatar
 *
 * Upload a new avatar image for the authenticated user. The image is stored
 * as a base-64 data-URI in the `avatar_url` column.
 *
 * Expects `req.file` to be populated by multer (or equivalent middleware).
 *
 * Body params: userId
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.uploadAvatar = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);
    const hasUpdatedAtColumn = await hasProfilesUpdatedAtColumn();

    if (!requestedUserId) {
      return res.status(400).json({ error: "userId required" });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
    const avatarUrl = `data:${mimeType};base64,${base64}`;

    const result = await runQuery(
      hasUpdatedAtColumn
        ? `INSERT INTO profiles (user_id, full_name, avatar_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET avatar_url  = EXCLUDED.avatar_url,
               updated_at  = NOW()
           RETURNING avatar_url`
        : `INSERT INTO profiles (user_id, full_name, avatar_url)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE
           SET avatar_url = EXCLUDED.avatar_url
           RETURNING avatar_url`,
      [requestedUserId, "User", avatarUrl]
    );

    if (!result.rows?.length) {
      return res.status(500).json({ error: "Failed to update avatar" });
    }

    logger.info("Avatar updated for user:", requestedUserId);
    invalidateProfileCache(requestedUserId);
    return res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    logger.error("Error uploading avatar:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ────────────────────────────────────────────────────────────
// PAYOUT ACCOUNT LINKING (Razorpay)
// ────────────────────────────────────────────────────────────

/**
 * Ensure the `profiles` table carries all payout columns used by the linking
 * flow (idempotent, self-healing on older schemas).
 */
async function ensurePayoutColumns() {
  const stmts = [
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_upi_id VARCHAR(100)`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_contact_id VARCHAR(100)`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_fund_account_id VARCHAR(100)`,
  ];
  for (const sql of stmts) {
    try {
      await runQuery(sql);
    } catch (err) {
      logger.warn("[PAYOUT_LINK] ensurePayoutColumns stmt failed:", err.message);
    }
  }
}

/**
 * POST /profile/payout-link
 * Link a Razorpay payout account (bank account or UPI) for the authenticated user.
 * This creates a Razorpay Contact + Fund Account so the platform can pay out.
 *
 * Body params:
 *   - type: "bank_account" | "upi"
 *   - bank_account: { account_number, ifsc, beneficiary_name } (for bank_account type)
 *   - upi_id: string (for upi type)
 */
exports.linkPayoutAccount = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { type, bank_account, upi_id } = req.body;

  if (!type || !["bank_account", "upi"].includes(type)) {
    return res.status(400).json({ error: "type must be 'bank_account' or 'upi'" });
  }

  try {
    await ensurePayoutColumns();

    // Step 1: Ensure the user has a Razorpay contact
    const razorpayService = require("../services/razorpayService");
    const contactResult = await razorpayService.ensureContact(userId);

    if (!contactResult.success) {
      return res.status(502).json({ error: "Failed to create Razorpay contact", details: contactResult.error });
    }

    // Step 2: Create fund account based on type
    let fundAccountResult;

    if (type === "bank_account") {
      if (!bank_account || !bank_account.account_number || !bank_account.ifsc || !bank_account.beneficiary_name) {
        return res.status(400).json({ error: "bank_account requires account_number, ifsc, and beneficiary_name" });
      }

      fundAccountResult = await razorpayService.createFundAccount({
        contactId: contactResult.contactId,
        accountType: "bank_account",
        accountDetails: {
          account_number: bank_account.account_number,
          ifsc: bank_account.ifsc,
          beneficiary_name: bank_account.beneficiary_name,
        },
      });
    } else {
      // UPI
      if (!upi_id) {
        return res.status(400).json({ error: "upi_id is required for UPI type" });
      }

      fundAccountResult = await razorpayService.createFundAccount({
        contactId: contactResult.contactId,
        accountType: "vpa",
        // Razorpay VPA fund-account schema requires { address }, not { vpa }.
        accountDetails: {
          address: upi_id,
        },
      });
    }

    if (!fundAccountResult.success) {
      return res.status(502).json({ error: "Failed to link payout account", details: fundAccountResult.error });
    }

    // Step 3: Store the linked account details in profiles
    const payoutDetails = type === "bank_account"
      ? JSON.stringify({ type: "bank_account", account_number: `XXXX${bank_account.account_number.slice(-4)}`, ifsc: bank_account.ifsc })
      : JSON.stringify({ type: "upi", upi_id });

    await runQuery(
      `UPDATE profiles SET
         razorpay_contact_id = $1,
         razorpay_fund_account_id = $2,
         payout_upi_id = $3,
         payout_bank_details = $4::jsonb
       WHERE user_id::text = $5`,
      [
        contactResult.contactId,
        fundAccountResult.fundAccountId,
        type === "upi" ? upi_id : null,
        payoutDetails,
        userId,
      ]
    );

    invalidateProfileCache(userId);

    logger.info(`[PAYOUT_LINK] User ${userId} linked ${type} payout account (fund_account: ${fundAccountResult.fundAccountId})`);

    res.json({
      success: true,
      message: "Payout account linked successfully",
      sandbox: fundAccountResult.sandbox || false,
      payout_method: type,
    });
  } catch (err) {
    logger.error("[PAYOUT_LINK] Error linking payout account:", err);
    res.status(500).json({ error: "Failed to link payout account" });
  }
};

/**
 * GET /profile/payout-status
 * Get the user's current payout account linking status.
 */
exports.getPayoutStatus = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await ensurePayoutColumns();

    const result = await runQuery(
      `SELECT
         payout_upi_id,
         payout_bank_details,
         razorpay_contact_id,
         razorpay_fund_account_id
       FROM profiles
       WHERE user_id::text = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ linked: false, payout_methods: [] });
    }

    const profile = result.rows[0];
    const methods = [];

    if (profile.payout_upi_id) {
      methods.push({ type: "upi", upi_id: profile.payout_upi_id, linked: true });
    }
    if (profile.payout_bank_details && Object.keys(profile.payout_bank_details).length > 0) {
      methods.push({ type: "bank_account", details: profile.payout_bank_details, linked: true });
    }

    res.json({
      linked: methods.length > 0,
      payout_methods: methods,
      razorpay_contact_id: profile.razorpay_contact_id || null,
      razorpay_fund_account_id: profile.razorpay_fund_account_id || null,
    });
  } catch (err) {
    logger.error("[PAYOUT_LINK] Error fetching payout status:", err);
    res.status(500).json({ error: "Failed to fetch payout status" });
  }
};
