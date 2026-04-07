const express = require("express");
const {
  sendCommand,
  approveCriticalCommand,
  acknowledgeCommand,
  getCommand,
  registerOtaArtifact,
  createOtaRollout,
  advanceOtaRollout,
  getOtaRollout,
  runDiagnostics,
  getSummary,
  sweepCommandTimeouts,
} = require("../services/fleetOrchestrationService");

const router = express.Router();

function authorizeFleetAdmin(req, res, next) {
  const configuredToken = String(process.env.FLEET_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }
  const providedToken = String(req.headers["x-fleet-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized fleet admin request.",
    });
  }
  return next();
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

router.post("/commands/send", (req, res) => {
  const result = sendCommand({
    deviceId: req.body?.deviceId || req.body?.device_id,
    tenantId: req.body?.tenantId || req.body?.tenant_id,
    commandType: req.body?.commandType || req.body?.command_type,
    payload: req.body?.payload,
    critical: req.body?.critical,
    actorId: resolveActorId(req),
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/commands/:commandId/approve", authorizeFleetAdmin, (req, res) => {
  const result = approveCriticalCommand({
    commandId: req.params.commandId,
    approverId: req.body?.approverId || req.body?.approver_id || resolveActorId(req),
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.post("/commands/:commandId/ack", (req, res) => {
  const result = acknowledgeCommand({
    commandId: req.params.commandId,
    ackCode: req.body?.ackCode || req.body?.ack_code,
    details: req.body?.details,
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
  return res.status(200).json(result);
});

router.post("/commands/sweep-timeouts", authorizeFleetAdmin, (_req, res) => {
  const timedOutCount = sweepCommandTimeouts(Date.now());
  return res.status(200).json({
    status: "ok",
    timedOutCount,
  });
});

router.get("/commands/:commandId", (req, res) => {
  const command = getCommand(req.params.commandId);
  if (!command) {
    return res.status(404).json({
      error: "Command not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    command,
  });
});

router.post("/ota/artifacts/register", authorizeFleetAdmin, (req, res) => {
  const result = registerOtaArtifact({
    version: req.body?.version,
    checksum: req.body?.checksum,
    signature: req.body?.signature,
    metadata: req.body?.metadata,
    actorId: resolveActorId(req),
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }
  return res.status(201).json(result);
});

router.post("/ota/rollouts/create", authorizeFleetAdmin, (req, res) => {
  const result = createOtaRollout({
    artifactVersion: req.body?.artifactVersion || req.body?.artifact_version,
    targetDeviceIds: req.body?.targetDeviceIds || req.body?.target_device_ids || [],
    canaryPercent: req.body?.canaryPercent || req.body?.canary_percent,
    actorId: resolveActorId(req),
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(201).json(result);
});

router.post("/ota/rollouts/:rolloutId/advance", authorizeFleetAdmin, (req, res) => {
  const result = advanceOtaRollout({
    rolloutId: req.params.rolloutId,
    mode: req.body?.mode,
  });

  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/ota/rollouts/:rolloutId", (req, res) => {
  const rollout = getOtaRollout(req.params.rolloutId);
  if (!rollout) {
    return res.status(404).json({
      error: "Rollout not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    rollout,
  });
});

router.post("/diagnostics/run", (req, res) => {
  const result = runDiagnostics({
    deviceId: req.body?.deviceId || req.body?.device_id,
    metrics: req.body?.metrics,
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.get("/summary", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    summary: getSummary(),
  });
});

module.exports = router;
