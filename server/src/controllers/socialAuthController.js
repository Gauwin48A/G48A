/**
 * Social Authentication Controller (#11)
 * Handles Google OAuth token verification and account linking.
 * Apple Sign-In can be added similarly.
 */

const { pool, runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const crypto = require("crypto");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Does NOT require the google-auth-library package.
 * @param {string} idToken
 * @returns {Promise<{email: string, name: string, picture: string, sub: string}|null>}
 */
async function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    const response = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) return null;
    const payload = await response.json();

    // Verify audience matches our client ID
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      logger.warn("[SocialAuth] Google token audience mismatch");
      return null;
    }

    // Verify token is not expired
    if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
      logger.warn("[SocialAuth] Google token expired");
      return null;
    }

    return {
      email: payload.email,
      name: payload.name || payload.given_name || "User",
      picture: payload.picture || null,
      sub: payload.sub,
      emailVerified: payload.email_verified === "true",
    };
  } catch (err) {
    logger.error("[SocialAuth] Google token verification failed:", err.message);
    return null;
  }
}

/**
 * POST /auth/social/google
 * Accepts a Google ID token, verifies it, and either logs in or creates a new account.
 */
exports.googleAuth = async (req, res) => {
  const client = await pool.connect();
  try {
    const { idToken, referralCode } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google Sign-In is not configured on this server" });
    }

    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser || !googleUser.email) {
      return res.status(401).json({ error: "Invalid or expired Google token" });
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await client.query(
      "SELECT user_id, name, email, role, is_active FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [normalizedEmail]
    );

    let user;
    let isNewAccount = false;

    if (existingUser.rows.length > 0) {
      // Existing user — log them in
      user = existingUser.rows[0];

      if (user.is_active === false) {
        client.release();
        return res.status(403).json({ error: "Account is deactivated. Contact support." });
      }

      // Update last login
      await client.query(
        "UPDATE users SET last_login = NOW(), login_attempts = 0 WHERE user_id = $1",
        [user.user_id]
      );

      // Link Google ID if not already linked
      try {
        await client.query(
          "UPDATE users SET google_id = $1 WHERE user_id = $2 AND google_id IS NULL",
          [googleUser.sub, user.user_id]
        );
      } catch (_e) {
        // google_id column may not exist yet
      }
    } else {
      // New user — create account
      isNewAccount = true;
      await client.query("BEGIN");

      const username = `${normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}_${crypto.randomBytes(4).toString("hex")}`;
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const argon2 = require("argon2");
      const hashedPassword = await argon2.hash(randomPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      let referrerUserId = null;
      if (referralCode) {
        const referralLookup = await client.query(
          "SELECT user_id FROM users WHERE referral_code = $1 LIMIT 1",
          [referralCode]
        );
        if (referralLookup.rows.length > 0) {
          referrerUserId = String(referralLookup.rows[0].user_id);
        }
      }

      const newUserResult = await client.query(
        `INSERT INTO users (username, name, email, password_hash, role, is_verified)
         VALUES ($1, $2, $3, $4, 'user', true)
         RETURNING user_id, name, email, role`,
        [username, googleUser.name, normalizedEmail, hashedPassword]
      );
      user = newUserResult.rows[0];

      // Create profile with Google avatar
      await client.query(
        `INSERT INTO profiles (user_id, full_name, avatar_url)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.user_id, googleUser.name, googleUser.picture]
      );

      // Link Google ID
      try {
        await client.query(
          "UPDATE users SET google_id = $1, referred_by = $2 WHERE user_id = $3",
          [googleUser.sub, referrerUserId, user.user_id]
        );
      } catch (_e) {
        // google_id column may not exist
      }

      // Create notification preferences
      try {
        await runQuery(
          `INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, sms_notifications, sound_enabled)
           VALUES ($1, true, true, false, true)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.user_id]
        );
      } catch (_e) {
        // table may not exist
      }

      // Award signup bonus
      try {
        const { addCoins, EARN_AMOUNTS } = require("./coinController");
        await addCoins(user.user_id, EARN_AMOUNTS.welcome_bonus, "welcome_bonus", `welcome_bonus:${user.user_id}`, "Welcome bonus");
      } catch (_e) {
        // non-fatal
      }

      await client.query("COMMIT");
    }

    // Create session (same as regular login)
    const { createSession } = require("./authController");
    if (typeof createSession !== "function") {
      throw new Error("createSession not available from authController");
    }
    const sessionData = await createSession(user, req, res);

    // Audit log
    try {
      await runQuery(
        "INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)",
        [user.user_id, isNewAccount ? "SOCIAL_SIGNUP_GOOGLE" : "SOCIAL_LOGIN_GOOGLE", req.ip, req.headers["user-agent"]]
      );
    } catch (_e) {
      // non-fatal
    }

    res.json({
      success: true,
      isNewAccount,
      emailVerified: true,
      ...sessionData,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_e) { /* ignore */ }
    logger.error("[SocialAuth] Google auth error:", err);
    res.status(500).json({ error: "Social authentication failed" });
  } finally {
    client.release();
  }
};
