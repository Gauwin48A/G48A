/**
 * Suspension Check Middleware
 *
 * Blocks all API requests from suspended users EXCEPT:
 * - Sale-related routes (so they can respond to fraud)
 * - Auth routes (so they can stay logged in)
 * - Health/readiness probes
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

// Paths that are always allowed even when suspended.
// Includes the order-dispute routes so parties frozen by an ORDER dispute can still
// view the dispute thread, add messages, upload evidence, and view their order.
const ALLOWED_PATHS = [
  "/api/sales",
  "/api/sale",
  "/api/user/suspension",
  "/api/disputes",
  "/api/orders",
  "/api/auth",
  "/health",
  "/api/health",
  "/api/ready",
];

function isPathAllowed(path) {
  return ALLOWED_PATHS.some((allowed) => path.startsWith(allowed));
}

const suspensionCheck = async (req, res, next) => {
  // Skip check for non-API routes and allowed paths
  if (!req.path.startsWith("/api") || isPathAllowed(req.path)) {
    return next();
  }

  // Only check authenticated users
  if (!req.user || !req.user.userId) {
    return next();
  }

  try {
    const userId = req.user.userId || req.user.id || req.user.user_id;

    const result = await runQuery(
      `SELECT id, reason, suspended_until, is_active, responded, permanently_locked
       FROM suspensions
       WHERE user_id::text = $1 AND (is_active = true OR permanently_locked = true)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return next();
    }

    const suspension = result.rows[0];

    // Permanently locked — block everything except allowed paths
    if (suspension.permanently_locked) {
      return res.status(403).json({
        error: "Account permanently locked due to unresolved fraud report.",
        code: "ACCOUNT_LOCKED_PERMANENT",
        suspensionId: suspension.id,
        onlySaleDoneAccessible: true,
      });
    }

    // Active 24hr suspension — check if expired
    const now = new Date();
    const suspendedUntil = new Date(suspension.suspended_until);

    if (now > suspendedUntil) {
      // Suspension expired, auto-deactivate
      if (!suspension.responded) {
        // No response within 24hrs — the cron job will handle permanent locking.
        // For now, just deactivate so the user can access the respond page.
        logger.warn(`[Suspension] Expired suspension for ${userId} - cron will process permanent lock`);
      }
      await runQuery(
        `UPDATE suspensions SET is_active = false WHERE id = $1`,
        [suspension.id]
      );
      return next();
    }

    // Active suspension — block non-allowed paths
    return res.status(403).json({
      error: "Your account is temporarily suspended due to a fraud report. You can only access the Sale Done page to respond.",
      code: "ACCOUNT_SUSPENDED",
      suspensionId: suspension.id,
      remainingHours: Math.max(0, Math.floor((suspendedUntil.getTime() - now.getTime()) / (1000 * 60 * 60))),
      remainingMinutes: Math.max(0, Math.floor(((suspendedUntil.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60))),
      onlySaleDoneAccessible: true,
    });
  } catch (err) {
    logger.error("[SuspensionCheck] Error checking suspension:", err);
    // Fail open — allow request if check fails
    return next();
  }
};

module.exports = { suspensionCheck };
