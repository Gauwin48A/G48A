const express = require("express");
const {
  registerSlo,
  recordAvailabilitySample,
  getSlo,
  ingestTrace,
  listRecentTraces,
  runChaosExperiment,
  recordBackupRestoreDrill,
  openIncidentCommand,
  publishPostmortem,
  getSummary,
} = require("../services/reliabilityOpsService");

const router = express.Router();

function authorizeReliabilityAdmin(req, res, next) {
  const configuredToken = String(process.env.RELIABILITY_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return next();
  }
  const providedToken = String(req.headers["x-reliability-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized reliability admin request.",
    });
  }
  return next();
}

router.post("/slos/register", authorizeReliabilityAdmin, (req, res) => {
  const result = registerSlo(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/slos/availability-sample", (req, res) => {
  const result = recordAvailabilitySample(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/slos/:serviceName", (req, res) => {
  const slo = getSlo(req.params.serviceName);
  if (!slo) {
    return res.status(404).json({
      error: "SLO not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    slo,
  });
});

router.post("/observability/traces", (req, res) => {
  const result = ingestTrace(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/observability/recent", (req, res) => {
  return res.status(200).json({
    status: "ok",
    traces: listRecentTraces(req.query?.limit || 50),
  });
});

router.post("/chaos/run", authorizeReliabilityAdmin, (req, res) => {
  const result = runChaosExperiment(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/drills/backup-restore", authorizeReliabilityAdmin, (req, res) => {
  const result = recordBackupRestoreDrill(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/incidents/open", (req, res) => {
  const result = openIncidentCommand(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/incidents/:incidentId/postmortem", authorizeReliabilityAdmin, (req, res) => {
  const result = publishPostmortem({
    ...req.body,
    incidentId: req.params.incidentId,
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
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
