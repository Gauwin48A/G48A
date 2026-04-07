const express = require("express");
const crypto = require("crypto");
const { verifyDeviceAttestation } = require("../middleware/deviceIdentity");
const {
  ingestTelemetryBatch,
  replayTelemetryBatch,
  getTelemetryMetrics,
  getRecentEvents,
  getPolicyConfig,
  getSchemaRegistrySnapshot,
  registerSchemaDefinition,
  activateSchemaVersion,
  deprecateSchemaVersion,
  getActiveSchemaVersions,
} = require("../services/telemetryPipelineService");

const router = express.Router();

function resolveTenantId(req) {
  const bodyTenantId = String(req.body?.tenantId || req.body?.tenant_id || "").trim();
  if (bodyTenantId) return bodyTenantId;
  const headerTenantId = String(req.headers["x-tenant-id"] || req.headers["x-org-id"] || "").trim();
  return headerTenantId || null;
}

function authorizeReplayRequest(req, res, next) {
  const configuredReplayToken = String(process.env.TELEMETRY_REPLAY_TOKEN || "").trim();
  if (!configuredReplayToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }

  const providedReplayToken = String(req.headers["x-telemetry-replay-token"] || "").trim();
  if (!providedReplayToken || !crypto.timingSafeEqual(Buffer.from(configuredReplayToken), Buffer.from(providedReplayToken.padEnd(configuredReplayToken.length).slice(0, configuredReplayToken.length)))) {
    return res.status(401).json({
      error: "Unauthorized telemetry replay request.",
    });
  }
  return next();
}

function authorizeSchemaAdminRequest(req, res, next) {
  const configuredAdminToken = String(process.env.TELEMETRY_SCHEMA_ADMIN_TOKEN || "").trim();
  if (!configuredAdminToken) {
    return res.status(403).json({ error: "This endpoint is not configured. Set the required admin token environment variable." });
  }

  const providedAdminToken = String(req.headers["x-telemetry-schema-token"] || "").trim();
  if (!providedAdminToken || !crypto.timingSafeEqual(Buffer.from(configuredAdminToken), Buffer.from(providedAdminToken.padEnd(configuredAdminToken.length).slice(0, configuredAdminToken.length)))) {
    return res.status(401).json({
      error: "Unauthorized telemetry schema admin request.",
    });
  }
  return next();
}

function resolveEventsPayload(body) {
  if (Array.isArray(body?.events)) {
    return body.events;
  }
  if (body && typeof body === "object" && Object.keys(body).length > 0) {
    return [body];
  }
  return [];
}

function normalizeVitalsPayload(rawPayload) {
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    return rawPayload;
  }
  return {};
}

router.post("/ingest", verifyDeviceAttestation, (req, res) => {
  const events = resolveEventsPayload(req.body);
  if (events.length === 0) {
    return res.status(400).json({
      error: "No telemetry events provided.",
    });
  }

  const result = ingestTelemetryBatch({
    events,
    protocol: req.body?.protocol || req.headers["x-telemetry-protocol"] || "http",
    schemaVersion: req.body?.schema_version || req.body?.schemaVersion || null,
    tenantId: resolveTenantId(req),
    deviceId: req.deviceIdentity?.deviceId || req.body?.deviceId || req.body?.device_id || null,
    source: "ingest",
  });

  return res.status(202).json(result);
});

router.post("/vitals", verifyDeviceAttestation, (req, res) => {
  const events = resolveEventsPayload(req.body);
  if (events.length === 0) {
    return res.status(400).json({
      error: "No telemetry events provided.",
    });
  }

  const fallbackDeviceId =
    req.deviceIdentity?.deviceId ||
    req.body?.deviceId ||
    req.body?.device_id ||
    req.headers["x-device-id"] ||
    "web";

  const normalizedEvents = events.map((event) => {
    const payload = normalizeVitalsPayload(
      event?.payload || event?.metrics || event?.data
    );
    return {
      ...event,
      schema_version: event?.schema_version || event?.schemaVersion || "1",
      event_type: event?.event_type || event?.eventType || "web_vitals",
      device_id: event?.device_id || event?.deviceId || fallbackDeviceId,
      timestamp: event?.timestamp || event?.occurred_at || event?.occurredAt || new Date().toISOString(),
      payload,
    };
  });

  const result = ingestTelemetryBatch({
    events: normalizedEvents,
    protocol: req.body?.protocol || req.headers["x-telemetry-protocol"] || "web",
    schemaVersion: "1",
    tenantId: resolveTenantId(req),
    deviceId: fallbackDeviceId,
    source: "vitals",
  });

  return res.status(202).json(result);
});

router.post("/replay", authorizeReplayRequest, (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  if (events.length === 0) {
    return res.status(400).json({
      error: "Replay request requires events array.",
    });
  }

  const result = replayTelemetryBatch({
    events,
    schemaVersion: req.body?.schema_version || req.body?.schemaVersion || null,
    tenantId: resolveTenantId(req),
    deviceId: req.body?.deviceId || req.body?.device_id || null,
  });
  return res.status(202).json(result);
});

router.get("/metrics", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    metrics: getTelemetryMetrics(),
  });
});

router.get("/schemas", (_req, res) => {
  const config = getPolicyConfig(process.env);
  return res.status(200).json({
    status: "ok",
    configuredSchemaVersions: config.configuredSchemaVersions,
    activeSchemaVersions: getActiveSchemaVersions(),
    registry: getSchemaRegistrySnapshot(),
    maxEventsPerRequest: config.maxEventsPerRequest,
  });
});

router.post("/schemas/register", authorizeSchemaAdminRequest, (req, res) => {
  const result = registerSchemaDefinition({
    schemaVersion: req.body?.schemaVersion || req.body?.schema_version,
    eventType: req.body?.eventType || req.body?.event_type,
    requiredFields: req.body?.requiredFields || req.body?.required_fields || [],
    optionalFields: req.body?.optionalFields || req.body?.optional_fields || [],
    compatibilityMode: req.body?.compatibilityMode || req.body?.compatibility_mode || "backward",
    description: req.body?.description || null,
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

router.post("/schemas/activate", authorizeSchemaAdminRequest, (req, res) => {
  const result = activateSchemaVersion(req.body?.schemaVersion || req.body?.schema_version);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.post("/schemas/deprecate", authorizeSchemaAdminRequest, (req, res) => {
  const result = deprecateSchemaVersion(req.body?.schemaVersion || req.body?.schema_version);
  if (result.status === "invalid") {
    return res.status(400).json(result);
  }
  if (result.status === "not_found") {
    return res.status(404).json(result);
  }
  return res.status(200).json(result);
});

router.get("/recent", (req, res) => {
  const limit = req.query?.limit;
  return res.status(200).json({
    status: "ok",
    events: getRecentEvents(limit),
  });
});

module.exports = router;
