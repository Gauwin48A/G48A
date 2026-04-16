const {
  enforceAuthSessionRetention,
} = require("../services/authSessionRetentionService");

const RETENTION_SWEEP_INTERVAL_MS = Number.parseInt(
  process.env.AUTH_SESSION_RETENTION_SWEEP_INTERVAL_MS || String(10 * 60 * 1000),
  10,
);

let retentionSweepInFlight = null;
let nextAllowedSweepAtMs = 0;

function triggerRetentionSweep() {
  const now = Date.now();
  if (now < nextAllowedSweepAtMs) {
    return;
  }

  if (!retentionSweepInFlight) {
    retentionSweepInFlight = enforceAuthSessionRetention().finally(() => {
      retentionSweepInFlight = null;
      nextAllowedSweepAtMs = Date.now() + RETENTION_SWEEP_INTERVAL_MS;
    });
  }
}

function authSessionRetentionMiddleware(_req, _res, next) {
  try {
    triggerRetentionSweep();
  } catch {
    // Never block auth flow due to retention housekeeping.
  }
  return next();
}

module.exports = {
  authSessionRetentionMiddleware,
};
