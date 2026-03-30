const crypto = require("crypto");

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function resolvePolicy() {
  return {
    abuseBlockThreshold: parsePositiveInteger(process.env.SECURITY_ABUSE_BLOCK_THRESHOLD || "5", 5),
    minRetentionDays: parsePositiveInteger(process.env.SECURITY_MIN_RETENTION_DAYS || "7", 7),
    maxRetentionDays: parsePositiveInteger(process.env.SECURITY_MAX_RETENTION_DAYS || "3650", 3650),
    incidentMttdTargetMinutes: parsePositiveInteger(
      process.env.SECURITY_INCIDENT_MTTD_TARGET_MINUTES || "5",
      5
    ),
    evidenceLogMax: parsePositiveInteger(process.env.SECURITY_EVIDENCE_LOG_MAX || "1000", 1000),
  };
}

const accessAuditLog = [];
const abuseSignalsBySource = new Map();
const dependencyAttestationsByKey = new Map();
const retentionPoliciesByTenant = new Map();
const deletionEvidenceLog = [];
const incidentsById = new Map();

function resolveRoleCapabilities() {
  return {
    viewer: new Set(["read"]),
    operator: new Set(["read", "write", "execute"]),
    auditor: new Set(["read", "audit"]),
    admin: new Set(["*"]),
  };
}

function evaluateAccess(input = {}) {
  const actorId = String(input.actorId || input.actor_id || "").trim() || null;
  const role = String(input.role || "").trim().toLowerCase();
  const action = String(input.action || "").trim().toLowerCase();
  const resource = String(input.resource || "").trim() || null;
  const tenantId = String(input.tenantId || input.tenant_id || "").trim() || null;
  const context = toObject(input.context);
  const contextTenantId = String(context.tenantId || context.tenant_id || "").trim() || null;

  if (!role || !action || !resource) {
    return {
      status: "invalid",
      message: "role, action, and resource are required.",
    };
  }

  const capabilities = resolveRoleCapabilities();
  const roleActions = capabilities[role];
  let decision = "deny";
  let reason = "Unknown role.";
  if (roleActions) {
    decision = roleActions.has("*") || roleActions.has(action) ? "allow" : "deny";
    reason = decision === "allow" ? "Role policy allow." : "Role policy deny.";
  }

  if (decision === "allow" && contextTenantId && tenantId && contextTenantId !== tenantId) {
    const privilegedRole = role === "admin" || role === "auditor";
    if (!privilegedRole) {
      decision = "deny";
      reason = "Tenant context mismatch.";
    }
  }

  const audit = {
    auditId: createId("access"),
    actorId,
    role,
    tenantId,
    contextTenantId,
    resource,
    action,
    decision,
    reason,
    evaluatedAt: new Date().toISOString(),
  };
  accessAuditLog.push(audit);

  return {
    status: "evaluated",
    decision,
    reason,
    audit,
  };
}

function recordAbuseSignal(input = {}) {
  const sourceIp = String(input.sourceIp || input.source_ip || "").trim();
  const vector = String(input.vector || "").trim();
  const severity = String(input.severity || "medium")
    .trim()
    .toLowerCase();
  if (!sourceIp || !vector) {
    return {
      status: "invalid",
      message: "sourceIp and vector are required.",
    };
  }

  const policy = resolvePolicy();
  const existing = abuseSignalsBySource.get(sourceIp) || {
    sourceIp,
    totalSignals: 0,
    vectors: {},
    blocked: false,
    updatedAt: null,
  };
  const next = {
    ...existing,
    totalSignals: existing.totalSignals + 1,
    vectors: {
      ...existing.vectors,
      [vector]: (existing.vectors[vector] || 0) + 1,
    },
    lastSeverity: severity,
    blocked: existing.totalSignals + 1 >= policy.abuseBlockThreshold,
    updatedAt: new Date().toISOString(),
  };
  abuseSignalsBySource.set(sourceIp, next);
  return {
    status: "recorded",
    signal: next,
  };
}

function registerDependencyAttestation(input = {}) {
  const packageName = String(input.packageName || input.package_name || "").trim();
  const version = String(input.version || "").trim();
  const integrityHash = String(input.integrityHash || input.integrity_hash || "").trim();
  const criticalVulnerabilityCount = parsePositiveInteger(
    input.criticalVulnerabilityCount || input.critical_vulnerability_count || "0",
    0
  );
  if (!packageName || !version || integrityHash.length < 16) {
    return {
      status: "invalid",
      message: "packageName, version, and integrityHash(min 16 chars) are required.",
    };
  }

  const key = `${packageName}@${version}`;
  const existing = dependencyAttestationsByKey.get(key);
  if (existing && existing.integrityHash === integrityHash) {
    return {
      status: "replayed",
      attestation: existing,
    };
  }

  const attestation = {
    packageName,
    version,
    integrityHash,
    criticalVulnerabilityCount,
    status: criticalVulnerabilityCount > 0 ? "warning" : "compliant",
    registeredAt: new Date().toISOString(),
  };
  dependencyAttestationsByKey.set(key, attestation);
  return {
    status: "registered",
    attestation,
  };
}

function configureRetentionPolicy(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const dataClass = String(input.dataClass || input.data_class || "").trim();
  const purpose = String(input.purpose || "").trim() || null;
  const retentionDays = parsePositiveInteger(input.retentionDays || input.retention_days || "0", 0);
  const policy = resolvePolicy();
  if (!tenantId || !dataClass || retentionDays < policy.minRetentionDays || retentionDays > policy.maxRetentionDays) {
    return {
      status: "invalid",
      message: `tenantId, dataClass, and retentionDays within ${policy.minRetentionDays}-${policy.maxRetentionDays} are required.`,
    };
  }

  const tenantPolicies = retentionPoliciesByTenant.get(tenantId) || {};
  const nextPolicy = {
    dataClass,
    retentionDays,
    purpose,
    configuredAt: new Date().toISOString(),
  };
  const nextTenantPolicies = {
    ...tenantPolicies,
    [dataClass]: nextPolicy,
  };
  retentionPoliciesByTenant.set(tenantId, nextTenantPolicies);
  return {
    status: "configured",
    policy: {
      tenantId,
      ...nextPolicy,
    },
  };
}

function runDeletionSweep(input = {}) {
  const targetTenantId = String(input.tenantId || input.tenant_id || "").trim() || null;
  const tenantEntries = targetTenantId
    ? [[targetTenantId, retentionPoliciesByTenant.get(targetTenantId) || {}]]
    : Array.from(retentionPoliciesByTenant.entries());

  const evidences = [];
  for (const [tenantId, policies] of tenantEntries) {
    for (const policy of Object.values(policies || {})) {
      evidences.push({
        evidenceId: createId("deletion"),
        tenantId,
        dataClass: policy.dataClass,
        retentionDays: policy.retentionDays,
        deletedRecordsEstimate: Math.max(1, Math.ceil(policy.retentionDays / 30)),
        generatedAt: new Date().toISOString(),
      });
    }
  }

  const runtimePolicy = resolvePolicy();
  deletionEvidenceLog.push(...evidences);
  if (deletionEvidenceLog.length > runtimePolicy.evidenceLogMax) {
    deletionEvidenceLog.splice(0, deletionEvidenceLog.length - runtimePolicy.evidenceLogMax);
  }

  return {
    status: "completed",
    evidenceCount: evidences.length,
    evidences,
  };
}

function openSecurityIncident(input = {}) {
  const title = String(input.title || "").trim();
  const severity = String(input.severity || "SEV3")
    .trim()
    .toUpperCase();
  const detector = String(input.detector || "system").trim();
  const detectedAfterMinutes = parsePositiveInteger(
    input.detectedAfterMinutes || input.detected_after_minutes || "1",
    1
  );
  if (!title) {
    return {
      status: "invalid",
      message: "title is required.",
    };
  }

  const incidentId = createId("sec_inc");
  const policy = resolvePolicy();
  const incident = {
    incidentId,
    title,
    severity,
    detector,
    status: "OPEN",
    detectedAfterMinutes,
    mttdTargetMinutes: policy.incidentMttdTargetMinutes,
    mttdBreached: detectedAfterMinutes > policy.incidentMttdTargetMinutes,
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
  incidentsById.set(incidentId, incident);
  return {
    status: "opened",
    incident,
  };
}

function acknowledgeSecurityIncident(incidentId, actorId) {
  const normalizedIncidentId = String(incidentId || "").trim();
  const normalizedActorId = String(actorId || "").trim() || null;
  if (!normalizedIncidentId) {
    return {
      status: "invalid",
      message: "incidentId is required.",
    };
  }
  const incident = incidentsById.get(normalizedIncidentId);
  if (!incident) {
    return {
      status: "not_found",
      message: "Incident not found.",
    };
  }
  if (incident.status === "ACKED") {
    return {
      status: "replayed",
      incident,
    };
  }

  const nextIncident = {
    ...incident,
    status: "ACKED",
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: normalizedActorId,
  };
  incidentsById.set(normalizedIncidentId, nextIncident);
  return {
    status: "acknowledged",
    incident: nextIncident,
  };
}

function listIncidents({ status = null, limit = 100 } = {}) {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  const max = parsePositiveInteger(limit, 100);
  return Array.from(incidentsById.values())
    .filter((incident) => !normalizedStatus || incident.status === normalizedStatus)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, max);
}

function getSummary() {
  let blockedSources = 0;
  for (const signal of abuseSignalsBySource.values()) {
    if (signal.blocked) blockedSources += 1;
  }

  return {
    accessEvaluations: accessAuditLog.length,
    abuseTrackedSources: abuseSignalsBySource.size,
    blockedSources,
    dependencyAttestations: dependencyAttestationsByKey.size,
    tenantRetentionPolicies: retentionPoliciesByTenant.size,
    deletionEvidenceEntries: deletionEvidenceLog.length,
    incidentsOpen: listIncidents({ status: "OPEN", limit: 100000 }).length,
    incidentsAcked: listIncidents({ status: "ACKED", limit: 100000 }).length,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  accessAuditLog.splice(0, accessAuditLog.length);
  abuseSignalsBySource.clear();
  dependencyAttestationsByKey.clear();
  retentionPoliciesByTenant.clear();
  deletionEvidenceLog.splice(0, deletionEvidenceLog.length);
  incidentsById.clear();
}

module.exports = {
  evaluateAccess,
  recordAbuseSignal,
  registerDependencyAttestation,
  configureRetentionPolicy,
  runDeletionSweep,
  openSecurityIncident,
  acknowledgeSecurityIncident,
  listIncidents,
  getSummary,
  resetForTests,
};
