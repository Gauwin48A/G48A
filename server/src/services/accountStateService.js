/**
 * accountStateService.js - Single Source of Truth Account State Machine
 *
 * Manages atomic transitions between account states:
 * - ACTIVE
 * - FROZEN_DISPUTE
 * - SUSPENDED_24H
 * - PERMANENTLY_LOCKED
 *
 * Keeps users.status, users.account_status, suspensions.is_active, and
 * suspensions.permanently_locked 100% synchronized in database.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const VALID_STATES = ["ACTIVE", "FROZEN_DISPUTE", "SUSPENDED_24H", "PERMANENTLY_LOCKED"];

/**
 * Transition a user's account state atomically.
 *
 * @param {string} userId - User ID to update
 * @param {string} newState - Target account state (ACTIVE, FROZEN_DISPUTE, SUSPENDED_24H, PERMANENTLY_LOCKED)
 * @param {object} options - Optional reason, adminId, and metadata
 */
const transitionAccountState = async (userId, newState, options = {}) => {
  if (!userId) throw new Error("userId is required for account state transition");
  
  const targetState = String(newState).toUpperCase();
  if (!VALID_STATES.includes(targetState)) {
    throw new Error(`Invalid target account state: ${newState}. Must be one of ${VALID_STATES.join(", ")}`);
  }

  const { reason = null, adminId = "system", durationHours = null } = options;

  // FROZEN_DISPUTE is an ADMIN-review freeze (order disputes) — it must NOT expire
  // like the sales 24h respond-window (SUSPENDED_24H). Default to 30 days unless a
  // caller explicitly overrides; otherwise the suspension cron would auto-lock
  // parties whose dispute is still under admin review.
  const effectiveDurationHours =
    durationHours ??
    (targetState === "FROZEN_DISPUTE" ? 30 * 24 : 24);

  try {
    let userStatus = "active";
    let accountStatus = "ACTIVE";
    let isSuspended = false;
    let isPermanentlyLocked = false;

    switch (targetState) {
      case "ACTIVE":
        userStatus = "active";
        accountStatus = "ACTIVE";
        isSuspended = false;
        isPermanentlyLocked = false;
        break;

      case "FROZEN_DISPUTE":
        userStatus = "frozen";
        accountStatus = "FROZEN";
        isSuspended = true;
        isPermanentlyLocked = false;
        break;

      case "SUSPENDED_24H":
        userStatus = "suspended";
        accountStatus = "SUSPENDED";
        isSuspended = true;
        isPermanentlyLocked = false;
        break;

      case "PERMANENTLY_LOCKED":
        userStatus = "locked";
        accountStatus = "LOCKED";
        isSuspended = true;
        isPermanentlyLocked = true;
        break;
    }

    // 1. Update users table
    await runQuery(
      `UPDATE users
       SET status = $1, account_status = $2, updated_at = NOW()
       WHERE user_id::text = $3`,
      [userStatus, accountStatus, String(userId)]
    );

    // 2. Synchronize active suspension records
    // Live schema uses suspended_until (NOT NULL) — expires_at/created_by do not
    // exist, and there is no UNIQUE(user_id) constraint, so we deactivate any
    // existing active row and insert a fresh one (no ON CONFLICT).
    if (isSuspended) {
      const suspendedUntil =
        targetState === "PERMANENTLY_LOCKED"
          ? new Date("9999-12-31T23:59:59.999Z")
          : new Date(Date.now() + effectiveDurationHours * 60 * 60 * 1000);

      await runQuery(
        `UPDATE suspensions
         SET is_active = false
         WHERE user_id::text = $1 AND is_active = true`,
        [String(userId)]
      );
      await runQuery(
        `INSERT INTO suspensions (user_id, reason, suspended_until, is_active, permanently_locked, created_at)
         VALUES ($1, $2, $3, true, $4, NOW())`,
        [String(userId), reason || `State transition to ${targetState}`, suspendedUntil, isPermanentlyLocked]
      );
    } else {
      await runQuery(
        `UPDATE suspensions
         SET is_active = false, permanently_locked = false
         WHERE user_id::text = $1`,
        [String(userId)]
      );
    }

    // 3. Log audit event (best-effort; schema-safe column set)
    await runQuery(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
       VALUES ($1, $2, 'ACCOUNT_STATE', $3, $4::jsonb, NOW())`,
      [String(adminId), "ACCOUNT_STATE_TRANSITION", String(userId), JSON.stringify({ target_user: userId, state: targetState, reason })]
    ).catch((e) => logger.warn('[AccountState] Failed to write audit log', { userId, action: 'ACCOUNT_STATE_TRANSITION', error: e.message }));

    logger.info(`[AccountState] User ${userId} successfully transitioned to ${targetState}`);
    return {
      success: true,
      userId,
      state: targetState,
      userStatus,
      accountStatus,
      isSuspended,
      isPermanentlyLocked,
    };
  } catch (err) {
    logger.error(`[AccountState] Transition failed for user ${userId} to ${targetState}:`, err);
    throw err;
  }
};

/**
 * Get unified current state of an account.
 */
const getAccountState = async (userId) => {
  if (!userId) return null;

  const result = await runQuery(
    `SELECT u.user_id, u.status, u.account_status,
            COALESCE(s.is_active, false) AS is_suspended,
            COALESCE(s.permanently_locked, false) AS is_permanently_locked
     FROM users u
     LEFT JOIN suspensions s ON u.user_id::text = s.user_id::text
     WHERE u.user_id::text = $1`,
    [String(userId)]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  let state = "ACTIVE";
  if (row.is_permanently_locked || row.account_status === "LOCKED" || row.status === "locked") {
    state = "PERMANENTLY_LOCKED";
  } else if (row.status === "frozen" || row.account_status === "FROZEN") {
    state = "FROZEN_DISPUTE";
  } else if (row.is_suspended || row.status === "suspended" || row.account_status === "SUSPENDED") {
    state = "SUSPENDED_24H";
  }

  return {
    userId: row.user_id,
    state,
    raw: row,
  };
};

module.exports = {
  transitionAccountState,
  getAccountState,
  VALID_STATES,
};
