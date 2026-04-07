const express = require("express");
const {
  registerRule,
  setRuleActivation,
  evaluateEvent,
  replayExecution,
  acknowledgeAlert,
  simulateRuleChange,
  listRules,
  listAlerts,
  getTwinState,
  getSummary,
} = require("../services/automationEngineService");

const router = express.Router();

function authorizeAutomationAdmin(req, res, next) {
  const configuredToken = String(process.env.AUTOMATION_RULES_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }
  const providedToken = String(req.headers["x-automation-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized automation admin request.",
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

router.post("/rules/register", authorizeAutomationAdmin, (req, res) => {
  const result = registerRule(req.body?.rule || req.body);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "replayed") {
    return res.status(200).json(result);
  }
  return res.status(201).json(result);
});

router.post("/rules/activate", authorizeAutomationAdmin, (req, res) => {
  const result = setRuleActivation(req.body?.ruleId || req.body?.rule_id, true);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.post("/rules/deactivate", authorizeAutomationAdmin, (req, res) => {
  const result = setRuleActivation(req.body?.ruleId || req.body?.rule_id, false);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/rules", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    rules: listRules(),
  });
});

router.post("/rules/simulate", authorizeAutomationAdmin, (req, res) => {
  const result = simulateRuleChange({
    rule: req.body?.rule,
    sampleEvents: req.body?.sampleEvents || req.body?.sample_events || [],
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/events/evaluate", (req, res) => {
  const result = evaluateEvent(req.body?.event || req.body);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "ignored") {
    return res.status(202).json(result);
  }
  return res.status(200).json(result);
});

router.post("/events/replay", (req, res) => {
  const result = replayExecution(req.body?.executionId || req.body?.execution_id);
  if (result.status === "disabled") {
    return res.status(403).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/twins/:deviceId", (req, res) => {
  const twin = getTwinState(req.params.deviceId);
  if (!twin) {
    return res.status(404).json({
      error: "Twin state not found.",
    });
  }
  return res.status(200).json({
    status: "ok",
    twin,
  });
});

router.get("/alerts", (req, res) => {
  const status = req.query?.status || null;
  const limit = req.query?.limit || 100;
  return res.status(200).json({
    status: "ok",
    alerts: listAlerts({ status, limit }),
  });
});

router.post("/alerts/:alertId/ack", (req, res) => {
  const result = acknowledgeAlert(req.params.alertId, resolveActorId(req));
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
