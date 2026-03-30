const express = require("express");
const {
  ingestHealthSignal,
  getDeviceHealth,
  recommendMaintenance,
  evaluateEnergyOptimization,
  recordCostUsage,
  getTenantCost,
  evaluateExperiment,
  getSummary,
} = require("../services/intelligenceFinopsService");

const router = express.Router();

function authorizeIntelligenceAdmin(req, res, next) {
  const configuredToken = String(process.env.INTELLIGENCE_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return next();
  }
  const providedToken = String(req.headers["x-intelligence-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized intelligence admin request.",
    });
  }
  return next();
}

router.post("/health/ingest", (req, res) => {
  const result = ingestHealthSignal(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/health/:deviceId", (req, res) => {
  const health = getDeviceHealth(req.params.deviceId);
  if (!health) {
    return res.status(404).json({
      error: "Device health not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    health,
  });
});

router.post("/maintenance/recommend", (req, res) => {
  const result = recommendMaintenance(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/energy/optimize", (req, res) => {
  const result = evaluateEnergyOptimization(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/finops/usage/record", authorizeIntelligenceAdmin, (req, res) => {
  const result = recordCostUsage(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/finops/tenants/:tenantId", (req, res) => {
  const ledger = getTenantCost(req.params.tenantId);
  if (!ledger) {
    return res.status(404).json({
      error: "Tenant ledger not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    ledger,
  });
});

router.post("/experiments/evaluate", authorizeIntelligenceAdmin, (req, res) => {
  const result = evaluateExperiment(req.body || {});
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
