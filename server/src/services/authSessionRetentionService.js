const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const DEFAULT_MAX_ACTIVE_SESSIONS = Number.parseInt(
  process.env.AUTH_MAX_ACTIVE_SESSIONS_PER_USER || "8",
  10,
);

function isMissingTable(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

async function enforceAuthSessionRetention({
  maxActiveSessionsPerUser = DEFAULT_MAX_ACTIVE_SESSIONS,
} = {}) {
  const effectiveCap = Number.isFinite(maxActiveSessionsPerUser) && maxActiveSessionsPerUser > 0
    ? Math.floor(maxActiveSessionsPerUser)
    : DEFAULT_MAX_ACTIVE_SESSIONS;

  try {
    const deactivateExpired = await runQuery(
      `
        UPDATE user_sessions
        SET is_active = false
        WHERE is_active = true
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
      `,
    );

    const capResult = await runQuery(
      `
        WITH ranked AS (
          SELECT
            session_id,
            ROW_NUMBER() OVER (
              PARTITION BY user_id
              ORDER BY COALESCE(last_activity, created_at) DESC, created_at DESC
            ) AS rank_index
          FROM user_sessions
          WHERE is_active = true
        )
        UPDATE user_sessions us
        SET is_active = false
        FROM ranked r
        WHERE us.session_id = r.session_id
          AND r.rank_index > $1
      `,
      [effectiveCap],
    );

    return {
      deactivatedExpiredCount: deactivateExpired.rowCount || 0,
      deactivatedOverCapCount: capResult.rowCount || 0,
      effectiveCap,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return {
        deactivatedExpiredCount: 0,
        deactivatedOverCapCount: 0,
        effectiveCap,
        skipped: true,
      };
    }

    logger.warn("[AUTH] Session retention enforcement failed", {
      message: error?.message,
    });

    return {
      deactivatedExpiredCount: 0,
      deactivatedOverCapCount: 0,
      effectiveCap,
      error: error?.message,
    };
  }
}

module.exports = {
  DEFAULT_MAX_ACTIVE_SESSIONS,
  enforceAuthSessionRetention,
};
