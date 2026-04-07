const express = require("express");
const {
  evaluateAccess,
  recordAbuseSignal,
  registerDependencyAttestation,
  configureRetentionPolicy,
  runDeletionSweep,
  openSecurityIncident,
  acknowledgeSecurityIncident,
  listIncidents,
  getSummary,
} = require("../services/securityTrustOpsService");

const router = express.Router();

function authorizeSecurityAdmin(req, res, next) {
  const configuredToken = String(process.env.SECURITY_OPS_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }
  const providedToken = String(req.headers["x-security-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized security admin request.",
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

router.post("/access/evaluate", (req, res) => {
  const result = evaluateAccess(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/abuse/signals", (req, res) => {
  const result = recordAbuseSignal(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/supply-chain/attest", authorizeSecurityAdmin, (req, res) => {
  const result = registerDependencyAttestation(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }
  return res.status(201).json(result);
});

router.post("/privacy/retention/policies", authorizeSecurityAdmin, (req, res) => {
  const result = configureRetentionPolicy(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/privacy/deletion/sweep", authorizeSecurityAdmin, (req, res) => {
  const result = runDeletionSweep(req.body || {});
  return res.status(200).json(result);
});

router.post("/incidents/open", (req, res) => {
  const result = openSecurityIncident(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/incidents/:incidentId/ack", authorizeSecurityAdmin, (req, res) => {
  const result = acknowledgeSecurityIncident(req.params.incidentId, resolveActorId(req));
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/incidents", (req, res) => {
  return res.status(200).json({
    status: "ok",
    incidents: listIncidents({
      status: req.query?.status || null,
      limit: req.query?.limit || 100,
    }),
  });
});

router.get("/summary", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    summary: getSummary(),
  });
});

module.exports = router;
