const express = require("express");
const {
  upsertTaskFlow,
  upsertFleetWidget,
  upsertPlaybook,
  runPlaybook,
  listPlaybooks,
  registerDeveloperApp,
  recordAccessibilityAudit,
  getSummary,
} = require("../services/operatorPlatformService");

const router = express.Router();

function authorizeOperatorAdmin(req, res, next) {
  const configuredToken = String(process.env.OPERATOR_PLATFORM_ADMIN_TOKEN || "").trim();
  if (!configuredToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }
  const providedToken = String(req.headers["x-operator-admin-token"] || "").trim();
  if (providedToken !== configuredToken) {
    return res.status(401).json({
      error: "Unauthorized operator admin request.",
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

router.post("/console/task-flows", authorizeOperatorAdmin, (req, res) => {
  const result = upsertTaskFlow(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/console/widgets", authorizeOperatorAdmin, (req, res) => {
  const result = upsertFleetWidget(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/playbooks/upsert", authorizeOperatorAdmin, (req, res) => {
  const result = upsertPlaybook(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/playbooks/:playbookId/run", (req, res) => {
  const result = runPlaybook({
    ...req.body,
    playbookId: req.params.playbookId,
    actorId: resolveActorId(req),
  });
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/playbooks", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    playbooks: listPlaybooks(),
  });
});

router.post("/developer/apps/register", authorizeOperatorAdmin, (req, res) => {
  const result = registerDeveloperApp(req.body || {});
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post("/ux/accessibility/audits", authorizeOperatorAdmin, (req, res) => {
  const result = recordAccessibilityAudit(req.body || {});
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
