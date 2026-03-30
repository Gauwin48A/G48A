function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeLifecycleState(rawValue) {
  const normalized = String(rawValue || "CLAIMED").trim().toUpperCase();
  const allowed = new Set(["CLAIMED", "ACTIVE", "SUSPENDED", "REVOKED", "DECOMMISSIONED"]);
  if (!allowed.has(normalized)) return "CLAIMED";
  return normalized;
}

const lifecycleByDeviceId = new Map();
const claimResultsByIdempotency = new Map();
const reconciliationResultsByEventId = new Map();
const credentialRotationResultsByIdempotency = new Map();

function resolveIdempotencyWindowMs() {
  const ttlSeconds = parsePositiveInteger(
    process.env.DEVICE_PROVISIONING_IDEMPOTENCY_TTL_SECONDS || "900",
    900
  );
  return ttlSeconds * 1000;
}

function purgeExpiredIdempotencyRecords(nowMs = Date.now()) {
  const idempotencyWindowMs = resolveIdempotencyWindowMs();

  for (const [key, value] of claimResultsByIdempotency.entries()) {
    if (!value || !Number.isFinite(value.createdAtMs)) {
      claimResultsByIdempotency.delete(key);
      continue;
    }
    if (nowMs - value.createdAtMs > idempotencyWindowMs) {
      claimResultsByIdempotency.delete(key);
    }
  }

  for (const [key, value] of reconciliationResultsByEventId.entries()) {
    if (!value || !Number.isFinite(value.createdAtMs)) {
      reconciliationResultsByEventId.delete(key);
      continue;
    }
    if (nowMs - value.createdAtMs > idempotencyWindowMs) {
      reconciliationResultsByEventId.delete(key);
    }
  }

  for (const [key, value] of credentialRotationResultsByIdempotency.entries()) {
    if (!value || !Number.isFinite(value.createdAtMs)) {
      credentialRotationResultsByIdempotency.delete(key);
      continue;
    }
    if (nowMs - value.createdAtMs > idempotencyWindowMs) {
      credentialRotationResultsByIdempotency.delete(key);
    }
  }
}

function claimDevice({ idempotencyKey, deviceId, tenantId, actorId, metadata = {} }) {
  const nowMs = Date.now();
  purgeExpiredIdempotencyRecords(nowMs);

  const normalizedDeviceId = String(deviceId || "").trim();
  const normalizedTenantId = String(tenantId || "").trim();
  const normalizedActorId = String(actorId || "").trim() || null;

  if (!idempotencyKey || !normalizedDeviceId || !normalizedTenantId) {
    return {
      status: "invalid",
      message: "idempotencyKey, deviceId, and tenantId are required.",
    };
  }

  const existingIdempotent = claimResultsByIdempotency.get(idempotencyKey);
  if (existingIdempotent) {
    const sameRequest =
      existingIdempotent.deviceId === normalizedDeviceId &&
      existingIdempotent.tenantId === normalizedTenantId;
    if (sameRequest) {
      return {
        status: "replayed",
        lifecycle: lifecycleByDeviceId.get(normalizedDeviceId) || null,
      };
    }
    return {
      status: "conflict",
      message: "Idempotency key was already used for a different claim request.",
    };
  }

  const currentLifecycle = lifecycleByDeviceId.get(normalizedDeviceId);
  if (
    currentLifecycle &&
    currentLifecycle.tenantId &&
    currentLifecycle.tenantId !== normalizedTenantId &&
    currentLifecycle.lifecycleState !== "DECOMMISSIONED"
  ) {
    return {
      status: "conflict",
      message: "Device is already bound to a different tenant.",
      lifecycle: currentLifecycle,
    };
  }

  const claimedAt = new Date(nowMs).toISOString();
  const lifecycle = {
    deviceId: normalizedDeviceId,
    tenantId: normalizedTenantId,
    lifecycleState: "CLAIMED",
    claimedAt,
    lastEventAt: claimedAt,
    revokedAt: null,
    actorId: normalizedActorId,
    metadata,
    credentialVersion: 1,
    credentialStatus: "ACTIVE",
    credentialRotatedAt: claimedAt,
    credentialRevokedAt: null,
  };

  lifecycleByDeviceId.set(normalizedDeviceId, lifecycle);
  claimResultsByIdempotency.set(idempotencyKey, {
    idempotencyKey,
    deviceId: normalizedDeviceId,
    tenantId: normalizedTenantId,
    createdAtMs: nowMs,
  });

  return {
    status: "created",
    lifecycle,
  };
}

function revokeDevice({ deviceId, reason, actorId }) {
  const nowIso = new Date().toISOString();
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedDeviceId) {
    return {
      status: "invalid",
      message: "deviceId is required.",
    };
  }

  const previous = lifecycleByDeviceId.get(normalizedDeviceId) || {
    deviceId: normalizedDeviceId,
    tenantId: null,
    claimedAt: null,
    metadata: {},
  };

  const lifecycle = {
    ...previous,
    lifecycleState: "REVOKED",
    revokedAt: nowIso,
    revokeReason: String(reason || "manual-revocation"),
    revokedBy: String(actorId || "").trim() || null,
    lastEventAt: nowIso,
  };
  lifecycleByDeviceId.set(normalizedDeviceId, lifecycle);

  return {
    status: "revoked",
    lifecycle,
  };
}

function rotateDeviceCredentials({ idempotencyKey, deviceId, reason, actorId }) {
  const nowMs = Date.now();
  purgeExpiredIdempotencyRecords(nowMs);

  const normalizedDeviceId = String(deviceId || "").trim();
  const normalizedIdempotencyKey = String(idempotencyKey || "").trim();
  if (!normalizedDeviceId || !normalizedIdempotencyKey) {
    return {
      status: "invalid",
      message: "deviceId and idempotencyKey are required.",
    };
  }

  const existingIdempotent = credentialRotationResultsByIdempotency.get(normalizedIdempotencyKey);
  if (existingIdempotent) {
    if (existingIdempotent.deviceId === normalizedDeviceId) {
      return {
        status: "replayed",
        lifecycle: lifecycleByDeviceId.get(normalizedDeviceId) || null,
      };
    }
    return {
      status: "conflict",
      message: "Idempotency key was already used for another device credential rotation.",
    };
  }

  const currentLifecycle = lifecycleByDeviceId.get(normalizedDeviceId);
  if (!currentLifecycle) {
    return {
      status: "not_found",
      message: "Device lifecycle not found.",
    };
  }

  const rotatedAtIso = new Date(nowMs).toISOString();
  const currentVersion = Number.parseInt(String(currentLifecycle.credentialVersion || "1"), 10) || 1;
  const nextVersion = currentVersion + 1;

  const nextLifecycle = {
    ...currentLifecycle,
    credentialVersion: nextVersion,
    credentialStatus: "ACTIVE",
    credentialRotationReason: String(reason || "scheduled-rotation"),
    credentialRotatedAt: rotatedAtIso,
    credentialRevokedAt: null,
    credentialRotatedBy: String(actorId || "").trim() || null,
    lastEventAt: rotatedAtIso,
  };
  lifecycleByDeviceId.set(normalizedDeviceId, nextLifecycle);
  credentialRotationResultsByIdempotency.set(normalizedIdempotencyKey, {
    idempotencyKey: normalizedIdempotencyKey,
    deviceId: normalizedDeviceId,
    createdAtMs: nowMs,
  });

  return {
    status: "rotated",
    lifecycle: nextLifecycle,
  };
}

function emergencyRevokeCredentials({ deviceId, reason, actorId }) {
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedDeviceId) {
    return {
      status: "invalid",
      message: "deviceId is required.",
    };
  }

  const currentLifecycle = lifecycleByDeviceId.get(normalizedDeviceId);
  if (!currentLifecycle) {
    return {
      status: "not_found",
      message: "Device lifecycle not found.",
    };
  }

  const revokedAtIso = new Date().toISOString();
  const nextLifecycle = {
    ...currentLifecycle,
    credentialStatus: "REVOKED",
    credentialRevokedAt: revokedAtIso,
    credentialRevokeReason: String(reason || "emergency-revocation"),
    credentialRevokedBy: String(actorId || "").trim() || null,
    lastEventAt: revokedAtIso,
  };
  lifecycleByDeviceId.set(normalizedDeviceId, nextLifecycle);

  return {
    status: "revoked",
    lifecycle: nextLifecycle,
  };
}

function getDeviceCredentialStatus(deviceId) {
  const lifecycle = getDeviceLifecycle(deviceId);
  if (!lifecycle) return null;
  return {
    deviceId: lifecycle.deviceId,
    credentialVersion: lifecycle.credentialVersion || 1,
    credentialStatus: lifecycle.credentialStatus || "UNKNOWN",
    credentialRotatedAt: lifecycle.credentialRotatedAt || null,
    credentialRevokedAt: lifecycle.credentialRevokedAt || null,
  };
}

function reconcileLifecycleEvent({ eventId, deviceId, lifecycleState, occurredAt, metadata = {} }) {
  const nowMs = Date.now();
  purgeExpiredIdempotencyRecords(nowMs);

  const normalizedEventId = String(eventId || "").trim();
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedEventId || !normalizedDeviceId) {
    return {
      status: "invalid",
      message: "eventId and deviceId are required.",
    };
  }

  const existingReplay = reconciliationResultsByEventId.get(normalizedEventId);
  if (existingReplay) {
    const sameDevice = existingReplay.deviceId === normalizedDeviceId;
    if (sameDevice) {
      return {
        status: "replayed",
        lifecycle: lifecycleByDeviceId.get(normalizedDeviceId) || null,
      };
    }
    return {
      status: "conflict",
      message: "eventId was already used for a different device.",
    };
  }

  const eventOccurredAtMs = Date.parse(occurredAt);
  const resolvedOccurredAtMs = Number.isFinite(eventOccurredAtMs) ? eventOccurredAtMs : nowMs;
  const currentLifecycle = lifecycleByDeviceId.get(normalizedDeviceId) || null;
  const currentLastEventMs = Date.parse(currentLifecycle?.lastEventAt || "");

  if (Number.isFinite(currentLastEventMs) && resolvedOccurredAtMs < currentLastEventMs) {
    reconciliationResultsByEventId.set(normalizedEventId, {
      eventId: normalizedEventId,
      deviceId: normalizedDeviceId,
      createdAtMs: nowMs,
    });
    return {
      status: "ignored",
      message: "Event is older than current lifecycle state.",
      lifecycle: currentLifecycle,
    };
  }

  const nextLifecycle = {
    ...(currentLifecycle || {
      deviceId: normalizedDeviceId,
      tenantId: null,
      claimedAt: null,
    }),
    lifecycleState: normalizeLifecycleState(lifecycleState),
    lastEventAt: new Date(resolvedOccurredAtMs).toISOString(),
    metadata: {
      ...(currentLifecycle?.metadata || {}),
      ...metadata,
    },
  };

  if (nextLifecycle.lifecycleState === "REVOKED" && !nextLifecycle.revokedAt) {
    nextLifecycle.revokedAt = nextLifecycle.lastEventAt;
  }

  lifecycleByDeviceId.set(normalizedDeviceId, nextLifecycle);
  reconciliationResultsByEventId.set(normalizedEventId, {
    eventId: normalizedEventId,
    deviceId: normalizedDeviceId,
    createdAtMs: nowMs,
  });

  return {
    status: "applied",
    lifecycle: nextLifecycle,
  };
}

function getDeviceLifecycle(deviceId) {
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedDeviceId) return null;
  return lifecycleByDeviceId.get(normalizedDeviceId) || null;
}

function getLifecycleSummary() {
  const byState = {};
  for (const value of lifecycleByDeviceId.values()) {
    const state = value.lifecycleState || "UNKNOWN";
    byState[state] = (byState[state] || 0) + 1;
  }
  return {
    totalDevices: lifecycleByDeviceId.size,
    byState,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  lifecycleByDeviceId.clear();
  claimResultsByIdempotency.clear();
  reconciliationResultsByEventId.clear();
  credentialRotationResultsByIdempotency.clear();
}

module.exports = {
  claimDevice,
  revokeDevice,
  rotateDeviceCredentials,
  emergencyRevokeCredentials,
  getDeviceCredentialStatus,
  reconcileLifecycleEvent,
  getDeviceLifecycle,
  getLifecycleSummary,
  resetForTests,
  normalizeLifecycleState,
};
