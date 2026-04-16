const crypto = require("crypto");

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseCommaSeparated(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFieldList(rawFields) {
  if (!Array.isArray(rawFields)) return [];
  const normalized = rawFields
    .map((field) => String(field || "").trim())
    .filter(Boolean);
  return [...new Set(normalized)];
}

const hotEvents = [];
const warmEvents = [];
const dedupeCache = new Map();
let coldArchivedEvents = 0;

const schemaRegistryByVersion = new Map();

function getPolicyConfig(env = process.env) {
  return {
    configuredSchemaVersions: parseCommaSeparated(env.TELEMETRY_SUPPORTED_SCHEMA_VERSIONS || "1"),
    maxEventsPerRequest: parsePositiveInteger(env.TELEMETRY_MAX_EVENTS_PER_REQUEST || "200", 200),
    dedupeTtlMs: parsePositiveInteger(env.TELEMETRY_DEDUPE_TTL_SECONDS || "300", 300) * 1000,
    hotRetentionMs: parsePositiveInteger(env.TELEMETRY_HOT_RETENTION_HOURS || "1", 1) * 60 * 60 * 1000,
    warmRetentionMs:
      parsePositiveInteger(env.TELEMETRY_WARM_RETENTION_DAYS || "7", 7) * 24 * 60 * 60 * 1000,
    strictSchemaFields: parseBoolean(env.TELEMETRY_SCHEMA_STRICT_FIELDS, false),
  };
}

function ensureSchemaRegistryInitialized(env = process.env) {
  const policy = getPolicyConfig(env);
  const nowIso = new Date().toISOString();
  for (const schemaVersion of policy.configuredSchemaVersions) {
    if (!schemaRegistryByVersion.has(schemaVersion)) {
      schemaRegistryByVersion.set(schemaVersion, {
        schemaVersion,
        status: "ACTIVE",
        createdAt: nowIso,
        updatedAt: nowIso,
        definitions: new Map(),
      });
    }
  }
}

function getActiveSchemaVersions() {
  ensureSchemaRegistryInitialized(process.env);
  const active = [];
  for (const [schemaVersion, record] of schemaRegistryByVersion.entries()) {
    if (record.status === "ACTIVE") {
      active.push(schemaVersion);
    }
  }
  return active.sort((a, b) => String(a).localeCompare(String(b)));
}

function getSchemaRegistrySnapshot() {
  ensureSchemaRegistryInitialized(process.env);
  const versions = [];
  for (const record of schemaRegistryByVersion.values()) {
    const definitions = [];
    for (const definition of record.definitions.values()) {
      definitions.push({
        eventType: definition.eventType,
        requiredFields: definition.requiredFields,
        optionalFields: definition.optionalFields,
        compatibilityMode: definition.compatibilityMode,
        description: definition.description,
        updatedAt: definition.updatedAt,
      });
    }
    definitions.sort((left, right) => left.eventType.localeCompare(right.eventType));
    versions.push({
      schemaVersion: record.schemaVersion,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      definitions,
    });
  }
  versions.sort((left, right) => left.schemaVersion.localeCompare(right.schemaVersion));
  return versions;
}

function registerSchemaDefinition({
  schemaVersion,
  eventType,
  requiredFields = [],
  optionalFields = [],
  compatibilityMode = "backward",
  description = null,
} = {}) {
  ensureSchemaRegistryInitialized(process.env);

  const normalizedSchemaVersion = String(schemaVersion || "").trim();
  const normalizedEventType = String(eventType || "").trim();
  if (!normalizedSchemaVersion || !normalizedEventType) {
    return {
      status: "invalid",
      message: "schemaVersion and eventType are required.",
    };
  }

  const normalizedCompatibilityMode = String(compatibilityMode || "backward").trim().toLowerCase();
  if (!["backward", "full", "none"].includes(normalizedCompatibilityMode)) {
    return {
      status: "invalid",
      message: "compatibilityMode must be one of backward/full/none.",
    };
  }

  const normalizedRequiredFields = normalizeFieldList(requiredFields);
  const normalizedOptionalFields = normalizeFieldList(optionalFields);
  const overlap = normalizedRequiredFields.find((field) => normalizedOptionalFields.includes(field));
  if (overlap) {
    return {
      status: "invalid",
      message: `Field "${overlap}" cannot be both required and optional.`,
    };
  }

  const nowIso = new Date().toISOString();
  if (!schemaRegistryByVersion.has(normalizedSchemaVersion)) {
    schemaRegistryByVersion.set(normalizedSchemaVersion, {
      schemaVersion: normalizedSchemaVersion,
      status: "DRAFT",
      createdAt: nowIso,
      updatedAt: nowIso,
      definitions: new Map(),
    });
  }

  const schemaRecord = schemaRegistryByVersion.get(normalizedSchemaVersion);
  const existing = schemaRecord.definitions.get(normalizedEventType);

  if (existing) {
    if (normalizedCompatibilityMode === "backward") {
      // Backward compatibility: do not add newly required fields.
      const newlyRequired = normalizedRequiredFields.filter(
        (field) => !existing.requiredFields.includes(field)
      );
      if (newlyRequired.length > 0) {
        return {
          status: "conflict",
          message: `Backward compatibility violation: newly required fields ${newlyRequired.join(", ")}`,
        };
      }
    }

    const sameDefinition =
      JSON.stringify(existing.requiredFields) === JSON.stringify(normalizedRequiredFields) &&
      JSON.stringify(existing.optionalFields) === JSON.stringify(normalizedOptionalFields) &&
      existing.compatibilityMode === normalizedCompatibilityMode &&
      String(existing.description || "") === String(description || "");

    if (sameDefinition) {
      return {
        status: "replayed",
        schemaVersion: normalizedSchemaVersion,
        eventType: normalizedEventType,
      };
    }
  }

  schemaRecord.definitions.set(normalizedEventType, {
    eventType: normalizedEventType,
    requiredFields: normalizedRequiredFields,
    optionalFields: normalizedOptionalFields,
    compatibilityMode: normalizedCompatibilityMode,
    description: String(description || "").trim() || null,
    updatedAt: nowIso,
  });
  schemaRecord.updatedAt = nowIso;

  return {
    status: "registered",
    schemaVersion: normalizedSchemaVersion,
    eventType: normalizedEventType,
    schemaStatus: schemaRecord.status,
  };
}

function activateSchemaVersion(schemaVersion) {
  ensureSchemaRegistryInitialized(process.env);
  const normalized = String(schemaVersion || "").trim();
  if (!normalized) {
    return {
      status: "invalid",
      message: "schemaVersion is required.",
    };
  }

  const schemaRecord = schemaRegistryByVersion.get(normalized);
  if (!schemaRecord) {
    return {
      status: "not_found",
      message: "Schema version not found.",
    };
  }

  schemaRecord.status = "ACTIVE";
  schemaRecord.updatedAt = new Date().toISOString();
  return {
    status: "activated",
    schemaVersion: normalized,
  };
}

function deprecateSchemaVersion(schemaVersion) {
  ensureSchemaRegistryInitialized(process.env);
  const normalized = String(schemaVersion || "").trim();
  if (!normalized) {
    return {
      status: "invalid",
      message: "schemaVersion is required.",
    };
  }

  const schemaRecord = schemaRegistryByVersion.get(normalized);
  if (!schemaRecord) {
    return {
      status: "not_found",
      message: "Schema version not found.",
    };
  }

  schemaRecord.status = "DEPRECATED";
  schemaRecord.updatedAt = new Date().toISOString();
  return {
    status: "deprecated",
    schemaVersion: normalized,
  };
}

function applyProtocolAdapter(rawEvent, protocol) {
  const normalizedProtocol = String(protocol || "http").trim().toLowerCase();
  const event = { ...(rawEvent || {}) };

  if (normalizedProtocol === "mqtt" && !event.event_type && event.topic) {
    event.event_type = String(event.topic).trim();
  }
  if (normalizedProtocol === "coap" && !event.timestamp && event.observed_at) {
    event.timestamp = event.observed_at;
  }
  if (event.data && !event.payload && typeof event.data === "object" && !Array.isArray(event.data)) {
    event.payload = event.data;
  }

  return event;
}

function buildEventId(normalizedEvent) {
  const explicitId = String(normalizedEvent.eventId || "").trim();
  if (explicitId) return explicitId;
  return crypto
    .createHash("sha256")
    .update(
      [
        normalizedEvent.deviceId || "",
        normalizedEvent.tenantId || "",
        normalizedEvent.eventType || "",
        normalizedEvent.occurredAt || "",
        JSON.stringify(normalizedEvent.payload || {}),
      ].join("|")
    )
    .digest("hex");
}

function normalizeTelemetryEvent(rawEvent, context, policyConfig) {
  const event = applyProtocolAdapter(rawEvent, context.protocol);
  const schemaVersion = String(
    event.schema_version || event.schemaVersion || context.schemaVersion || ""
  ).trim();

  if (!schemaVersion) {
    return {
      ok: false,
      reason: "Unsupported or missing schema_version.",
    };
  }

  ensureSchemaRegistryInitialized(process.env);
  const schemaRecord = schemaRegistryByVersion.get(schemaVersion);
  if (!schemaRecord || schemaRecord.status !== "ACTIVE") {
    return {
      ok: false,
      reason: "Unsupported or inactive schema_version.",
    };
  }

  const eventType = String(event.event_type || event.type || "").trim();
  if (!eventType) {
    return {
      ok: false,
      reason: "Missing event_type.",
    };
  }

  const deviceId = String(event.device_id || event.deviceId || context.deviceId || "").trim();
  if (!deviceId) {
    return {
      ok: false,
      reason: "Missing device_id.",
    };
  }

  const occurredAtRaw =
    event.timestamp || event.occurred_at || event.occurredAt || new Date().toISOString();
  const occurredAtMs = Date.parse(occurredAtRaw);
  if (!Number.isFinite(occurredAtMs)) {
    return {
      ok: false,
      reason: "Invalid timestamp.",
    };
  }

  const tenantId = String(event.tenant_id || event.tenantId || context.tenantId || "").trim() || null;
  const payload = event.payload || event.data || {};
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      reason: "payload/data must be an object.",
    };
  }

  const definition = schemaRecord.definitions.get(eventType);
  if (definition) {
    const missingRequired = definition.requiredFields.filter(
      (fieldName) => payload[fieldName] === undefined
    );
    if (missingRequired.length > 0) {
      return {
        ok: false,
        reason: `Missing required payload fields: ${missingRequired.join(", ")}`,
      };
    }

    if (policyConfig.strictSchemaFields) {
      const allowedFields = new Set([...definition.requiredFields, ...definition.optionalFields]);
      const unexpected = Object.keys(payload).filter((fieldName) => !allowedFields.has(fieldName));
      if (unexpected.length > 0) {
        return {
          ok: false,
          reason: `Unexpected payload fields: ${unexpected.join(", ")}`,
        };
      }
    }
  }

  const normalized = {
    eventId: String(event.event_id || event.eventId || "").trim() || null,
    schemaVersion,
    eventType,
    deviceId,
    tenantId,
    protocol: String(context.protocol || "http").trim().toLowerCase() || "http",
    source: String(context.source || "ingest").trim().toLowerCase() || "ingest",
    payload,
    occurredAt: new Date(occurredAtMs).toISOString(),
    occurredAtMs,
    ingestedAt: new Date().toISOString(),
    ingestedAtMs: Date.now(),
  };

  normalized.eventId = buildEventId(normalized);
  return {
    ok: true,
    event: normalized,
  };
}

function purgeExpiredData(policyConfig, nowMs = Date.now()) {
  for (const [eventId, value] of dedupeCache.entries()) {
    if (!value || !Number.isFinite(value.ingestedAtMs)) {
      dedupeCache.delete(eventId);
      continue;
    }
    if (nowMs - value.ingestedAtMs > policyConfig.dedupeTtlMs) {
      dedupeCache.delete(eventId);
    }
  }

  const hotCutoffMs = nowMs - policyConfig.hotRetentionMs;
  for (let index = hotEvents.length - 1; index >= 0; index -= 1) {
    const entry = hotEvents[index];
    if (!entry || entry.ingestedAtMs < hotCutoffMs) {
      if (entry) {
        warmEvents.push(entry);
      }
      hotEvents.splice(index, 1);
    }
  }

  const warmCutoffMs = nowMs - policyConfig.warmRetentionMs;
  for (let index = warmEvents.length - 1; index >= 0; index -= 1) {
    const entry = warmEvents[index];
    if (!entry || entry.ingestedAtMs < warmCutoffMs) {
      warmEvents.splice(index, 1);
      coldArchivedEvents += 1;
    }
  }
}

function ingestTelemetryBatch({
  events = [],
  protocol = "http",
  schemaVersion = null,
  tenantId = null,
  deviceId = null,
  source = "ingest",
} = {}) {
  const policyConfig = getPolicyConfig(process.env);
  ensureSchemaRegistryInitialized(process.env);

  const nowMs = Date.now();
  purgeExpiredData(policyConfig, nowMs);

  const normalizedInputEvents = Array.isArray(events) ? events : [events];
  const limitedEvents = normalizedInputEvents.slice(0, policyConfig.maxEventsPerRequest);
  const droppedDueToBatchLimit = Math.max(0, normalizedInputEvents.length - limitedEvents.length);

  const rejectedReasons = [];
  let accepted = 0;
  let replayed = 0;
  let rejected = 0;

  for (const rawEvent of limitedEvents) {
    const normalized = normalizeTelemetryEvent(
      rawEvent,
      {
        protocol,
        schemaVersion,
        tenantId,
        deviceId,
        source,
      },
      policyConfig
    );

    if (!normalized.ok) {
      rejected += 1;
      rejectedReasons.push(normalized.reason);
      continue;
    }

    const event = normalized.event;
    if (dedupeCache.has(event.eventId)) {
      replayed += 1;
      continue;
    }

    dedupeCache.set(event.eventId, { ingestedAtMs: event.ingestedAtMs });
    hotEvents.push(event);
    accepted += 1;
  }

  return {
    status: "processed",
    accepted,
    replayed,
    rejected,
    droppedDueToBatchLimit,
    rejectedReasons: [...new Set(rejectedReasons)].slice(0, 10),
    policy: {
      maxEventsPerRequest: policyConfig.maxEventsPerRequest,
      supportedSchemaVersions: getActiveSchemaVersions(),
    },
    processedAt: new Date().toISOString(),
  };
}

function replayTelemetryBatch({ events = [], schemaVersion = null, tenantId = null, deviceId = null } = {}) {
  return ingestTelemetryBatch({
    events,
    protocol: "replay",
    schemaVersion,
    tenantId,
    deviceId,
    source: "replay",
  });
}

function getTelemetryMetrics() {
  const policyConfig = getPolicyConfig(process.env);
  purgeExpiredData(policyConfig, Date.now());

  const protocolCounts = {};
  const schemaCounts = {};
  for (const entry of [...hotEvents, ...warmEvents]) {
    const protocol = entry.protocol || "unknown";
    protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
    const schemaVersion = entry.schemaVersion || "unknown";
    schemaCounts[schemaVersion] = (schemaCounts[schemaVersion] || 0) + 1;
  }

  return {
    hotEvents: hotEvents.length,
    warmEvents: warmEvents.length,
    coldArchivedEvents,
    dedupeKeys: dedupeCache.size,
    protocolCounts,
    schemaCounts,
    supportedSchemaVersions: getActiveSchemaVersions(),
    generatedAt: new Date().toISOString(),
  };
}

function getRecentEvents(limit = 50) {
  const normalizedLimit = parsePositiveInteger(limit, 50);
  const combined = [...hotEvents, ...warmEvents];
  return combined
    .sort((left, right) => right.ingestedAtMs - left.ingestedAtMs)
    .slice(0, normalizedLimit);
}

function resetForTests() {
  hotEvents.splice(0, hotEvents.length);
  warmEvents.splice(0, warmEvents.length);
  dedupeCache.clear();
  coldArchivedEvents = 0;
  schemaRegistryByVersion.clear();
}

module.exports = {
  ingestTelemetryBatch,
  replayTelemetryBatch,
  getTelemetryMetrics,
  getRecentEvents,
  resetForTests,
  getPolicyConfig,
  getSchemaRegistrySnapshot,
  registerSchemaDefinition,
  activateSchemaVersion,
  deprecateSchemaVersion,
  getActiveSchemaVersions,
};
