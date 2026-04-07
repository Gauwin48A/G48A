const express = require("express");
const {
  startTenantOnboarding,
  updateOnboardingStep,
  getOnboarding,
  recordUsage,
  getTenantUsage,
  registerComplianceEvidence,
  listComplianceEvidence,
  runCertification,
  registerIntegration,
  getSummary,
} = require("../services/launchGovernanceService");

const router = express.Router();

function authorizeLaunchAdmin(req, res, next) {
  const configuredToken = String(process.env.LAUNCH_GOVERNANCE_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }
  const providedToken = String(req.headers["x-launch-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized launch governance admin request.",
    });
  }
  return next();
}

router.post("/onboarding/start", (req, res) => {
  const result = startTenantOnboarding(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }
  return res.status(201).json(result);
});

router.post("/onboarding/:tenantId/steps", (req, res) => {
  const result = updateOnboardingStep({
    ...req.body,
    tenantId: req.params.tenantId,
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/onboarding/:tenantId", (req, res) => {
  const onboarding = getOnboarding(req.params.tenantId);
  if (!onboarding) {
    return res.status(404).json({
      error: "Tenant onboarding not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    onboarding,
  });
});

router.post("/billing/usage/record", (req, res) => {
  const result = recordUsage(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/billing/tenants/:tenantId", (req, res) => {
  const usage = getTenantUsage(req.params.tenantId);
  if (!usage) {
    return res.status(404).json({
      error: "Tenant usage not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    usage,
  });
});

router.post("/compliance/evidence/register", authorizeLaunchAdmin, (req, res) => {
  const result = registerComplianceEvidence(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/compliance/evidence", (req, res) => {
  return res.status(200).json({
    status: "ok",
    evidence: listComplianceEvidence({
      controlDomain: req.query?.controlDomain || req.query?.control_domain || null,
      limit: req.query?.limit || 100,
    }),
  });
});

router.post("/certification/run", authorizeLaunchAdmin, (req, res) => {
  const result = runCertification(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/ecosystem/integrations/register", authorizeLaunchAdmin, (req, res) => {
  const result = registerIntegration(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get("/summary", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    summary: getSummary(),
  });
});

module.exports = router;
