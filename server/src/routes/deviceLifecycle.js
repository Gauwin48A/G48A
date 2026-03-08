const express = require("express");
const {
  verifyDeviceAttestation,
  requireIdempotencyKey,
} = require("../middleware/deviceIdentity");
const {
  claimDevice,
  revokeDevice,
  rotateDeviceCredentials,
  emergencyRevokeCredentials,
  getDeviceCredentialStatus,
  reconcileLifecycleEvent,
  getDeviceLifecycle,
  getLifecycleSummary,
} = require("../services/deviceLifecycleService");

const router = express.Router();

function resolveTenantId(req) {
  const bodyTenantId = String(req.body?.tenantId || req.body?.tenant_id || "").trim();
  if (bodyTenantId) return bodyTenantId;
  const headerTenantId = String(req.headers["x-tenant-id"] || req.headers["x-org-id"] || "").trim();
  if (headerTenantId) return headerTenantId;
  const contextTenantId = String(req.tenantContext?.tenantId || "").trim();
  return contextTenantId || null;
}

function resolveActorId(req) {
  const raw =
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.body?.actorId ||
    req.body?.actor_id;
  const normalized = String(raw || "").trim();
  return normalized || null;
}

router.post("/claim", verifyDeviceAttestation, requireIdempotencyKey, (req, res) => {
  const deviceId = req.deviceIdentity?.deviceId || String(req.body?.deviceId || req.body?.device_id || "").trim();
  const tenantId = resolveTenantId(req);
  const actorId = resolveActorId(req);
  const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

  const result = claimDevice({
    idempotencyKey: req.idempotencyKey,
    deviceId,
    tenantId,
    actorId,
    metadata,
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "conflict") {
    return res.status(409).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }

  return res.status(201).json(result);
});

router.post("/revoke", verifyDeviceAttestation, (req, res) => {
  const deviceId = req.deviceIdentity?.deviceId || String(req.body?.deviceId || req.body?.device_id || "").trim();
  const reason = req.body?.reason;
  const actorId = resolveActorId(req);

  const result = revokeDevice({ deviceId, reason, actorId });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/rotate-credentials", verifyDeviceAttestation, requireIdempotencyKey, (req, res) => {
  const deviceId = req.deviceIdentity?.deviceId || String(req.body?.deviceId || req.body?.device_id || "").trim();
  const reason = req.body?.reason;
  const actorId = resolveActorId(req);

  const result = rotateDeviceCredentials({
    idempotencyKey: req.idempotencyKey,
    deviceId,
    reason,
    actorId,
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  if (result.status === "conflict") {
    return res.status(409).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }

  return res.status(200).json(result);
});

router.post("/revoke-credentials", verifyDeviceAttestation, (req, res) => {
  const deviceId = req.deviceIdentity?.deviceId || String(req.body?.deviceId || req.body?.device_id || "").trim();
  const reason = req.body?.reason;
  const actorId = resolveActorId(req);
  const result = emergencyRevokeCredentials({ deviceId, reason, actorId });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.post("/reconcile", verifyDeviceAttestation, (req, res) => {
  const eventId = String(req.body?.eventId || req.body?.event_id || "").trim();
  const deviceId = req.deviceIdentity?.deviceId || String(req.body?.deviceId || req.body?.device_id || "").trim();
  const lifecycleState = req.body?.lifecycleState || req.body?.lifecycle_state;
  const occurredAt = req.body?.occurredAt || req.body?.occurred_at;
  const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

  const result = reconcileLifecycleEvent({
    eventId,
    deviceId,
    lifecycleState,
    occurredAt,
    metadata,
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "conflict") {
    return res.status(409).json(result);
  }
  if (result.status === "ignored") {
    return res.status(202).json(result);
  }
  return res.status(200).json(result);
});

router.get("/status/:deviceId", (req, res) => {
  const lifecycle = getDeviceLifecycle(req.params.deviceId);
  if (!lifecycle) {
    return res.status(404).json({
      error: "Device lifecycle not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    lifecycle,
  });
});

router.get("/credentials/:deviceId", (req, res) => {
  const credentialStatus = getDeviceCredentialStatus(req.params.deviceId);
  if (!credentialStatus) {
    return res.status(404).json({
      error: "Device credential status not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    credentials: credentialStatus,
  });
});

router.get("/summary", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    summary: getLifecycleSummary(),
  });
});

module.exports = router;
