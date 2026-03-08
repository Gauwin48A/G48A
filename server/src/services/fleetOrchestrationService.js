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

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function resolvePolicy() {
  return {
    commandAckTimeoutSeconds: parsePositiveInteger(process.env.FLEET_COMMAND_ACK_TIMEOUT_SECONDS || "60", 60),
    requireDualApprovalForCritical: parseBoolean(
      process.env.FLEET_CRITICAL_COMMAND_REQUIRE_DUAL_APPROVAL,
      true
    ),
    otaRequireSignature: parseBoolean(process.env.OTA_REQUIRE_SIGNATURE, true),
    defaultCanaryPercent: parsePositiveInteger(process.env.OTA_DEFAULT_CANARY_PERCENT || "10", 10),
  };
}

function buildOtaSignature(version, checksum, secret) {
  return crypto.createHmac("sha256", secret).update(`${version}.${checksum}`).digest("hex");
}

function timingSafeHexEquals(expectedHex, providedHex) {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex) || !/^[a-f0-9]{64}$/i.test(providedHex)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

const commandsById = new Map();
const otaArtifactsByVersion = new Map();
const otaRolloutsById = new Map();

function sweepCommandTimeouts(nowMs = Date.now()) {
  let timedOutCount = 0;
  for (const [commandId, command] of commandsById.entries()) {
    if (command.status !== "SENT") continue;
    if (!Number.isFinite(command.ackDeadlineMs)) continue;
    if (nowMs <= command.ackDeadlineMs) continue;
    commandsById.set(commandId, {
      ...command,
      status: "TIMED_OUT",
      timeoutAt: new Date(nowMs).toISOString(),
    });
    timedOutCount += 1;
  }
  return timedOutCount;
}

function sendCommand({ deviceId, tenantId, commandType, payload = {}, actorId, critical = false } = {}) {
  const normalizedDeviceId = String(deviceId || "").trim();
  const normalizedCommandType = String(commandType || "").trim();
  if (!normalizedDeviceId || !normalizedCommandType) {
    return {
      status: "invalid",
      message: "deviceId and commandType are required.",
    };
  }

  const policy = resolvePolicy();
  const nowMs = Date.now();
  const commandId = createId("cmd");
  const isCritical = Boolean(critical);
  const pendingApproval = isCritical && policy.requireDualApprovalForCritical;
  const command = {
    commandId,
    deviceId: normalizedDeviceId,
    tenantId: String(tenantId || "").trim() || null,
    commandType: normalizedCommandType,
    payload: toObject(payload),
    critical: isCritical,
    status: pendingApproval ? "PENDING_APPROVAL" : "SENT",
    createdAt: new Date(nowMs).toISOString(),
    ackDeadlineMs: pendingApproval ? null : nowMs + policy.commandAckTimeoutSeconds * 1000,
    ackedAt: null,
    actorId: String(actorId || "").trim() || null,
    approvals: [],
  };
  commandsById.set(commandId, command);

  return {
    status: "queued",
    command,
  };
}

function approveCriticalCommand({ commandId, approverId } = {}) {
  const normalizedCommandId = String(commandId || "").trim();
  const normalizedApproverId = String(approverId || "").trim();
  if (!normalizedCommandId || !normalizedApproverId) {
    return {
      status: "invalid",
      message: "commandId and approverId are required.",
    };
  }

  const command = commandsById.get(normalizedCommandId);
  if (!command) {
    return {
      status: "not_found",
      message: "Command not found.",
    };
  }
  if (!command.critical) {
    return {
      status: "invalid",
      message: "Command is not critical.",
    };
  }

  if (command.approvals.includes(normalizedApproverId)) {
    return {
      status: "replayed",
      command,
    };
  }

  const nowMs = Date.now();
  const nextApprovals = [...command.approvals, normalizedApproverId];
  const shouldActivate = nextApprovals.length >= 2;
  const nextCommand = {
    ...command,
    approvals: nextApprovals,
    status: shouldActivate ? "SENT" : "PENDING_APPROVAL",
    ackDeadlineMs: shouldActivate
      ? nowMs + resolvePolicy().commandAckTimeoutSeconds * 1000
      : command.ackDeadlineMs,
    approvedAt: shouldActivate ? new Date(nowMs).toISOString() : null,
  };
  commandsById.set(normalizedCommandId, nextCommand);

  return {
    status: shouldActivate ? "approved" : "partially_approved",
    command: nextCommand,
  };
}

function acknowledgeCommand({ commandId, ackCode, details = {} } = {}) {
  const normalizedCommandId = String(commandId || "").trim();
  if (!normalizedCommandId) {
    return {
      status: "invalid",
      message: "commandId is required.",
    };
  }

  sweepCommandTimeouts(Date.now());
  const command = commandsById.get(normalizedCommandId);
  if (!command) {
    return {
      status: "not_found",
      message: "Command not found.",
    };
  }

  if (command.status === "ACKED") {
    return {
      status: "replayed",
      command,
    };
  }
  if (command.status === "TIMED_OUT") {
    return {
      status: "conflict",
      message: "Command already timed out.",
      command,
    };
  }
  if (command.status === "PENDING_APPROVAL") {
    return {
      status: "conflict",
      message: "Command is pending approval and cannot be acknowledged.",
      command,
    };
  }

  const nextCommand = {
    ...command,
    status: "ACKED",
    ackCode: String(ackCode || "OK").trim(),
    ackDetails: toObject(details),
    ackedAt: new Date().toISOString(),
  };
  commandsById.set(normalizedCommandId, nextCommand);
  return {
    status: "acked",
    command: nextCommand,
  };
}

function getCommand(commandId) {
  sweepCommandTimeouts(Date.now());
  const normalizedCommandId = String(commandId || "").trim();
  if (!normalizedCommandId) return null;
  return commandsById.get(normalizedCommandId) || null;
}

function registerOtaArtifact({ version, checksum, signature, metadata = {}, actorId } = {}) {
  const normalizedVersion = String(version || "").trim();
  const normalizedChecksum = String(checksum || "").trim();
  if (!normalizedVersion || !normalizedChecksum) {
    return {
      status: "invalid",
      message: "version and checksum are required.",
    };
  }

  const policy = resolvePolicy();
  const signingSecret = String(process.env.OTA_SIGNING_SECRET || "").trim();
  if (policy.otaRequireSignature) {
    if (!signingSecret) {
      return {
        status: "invalid",
        message: "OTA_SIGNING_SECRET is required when OTA signatures are enforced.",
      };
    }
    const providedSignature = String(signature || "").trim();
    if (!providedSignature) {
      return {
        status: "invalid",
        message: "signature is required.",
      };
    }
    const expected = buildOtaSignature(normalizedVersion, normalizedChecksum, signingSecret);
    if (!timingSafeHexEquals(expected, providedSignature)) {
      return {
        status: "invalid",
        message: "Invalid OTA artifact signature.",
      };
    }
  }

  const existing = otaArtifactsByVersion.get(normalizedVersion);
  if (existing && existing.checksum === normalizedChecksum) {
    return {
      status: "replayed",
      artifact: existing,
    };
  }

  const artifact = {
    version: normalizedVersion,
    checksum: normalizedChecksum,
    signature: String(signature || "").trim() || null,
    metadata: toObject(metadata),
    createdAt: new Date().toISOString(),
    actorId: String(actorId || "").trim() || null,
  };
  otaArtifactsByVersion.set(normalizedVersion, artifact);
  return {
    status: "registered",
    artifact,
  };
}

function pickCanaryDevices(targetDeviceIds, canaryPercent) {
  const uniqueTargets = [...new Set((targetDeviceIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  const percent = Math.max(1, Math.min(100, parsePositiveInteger(canaryPercent, resolvePolicy().defaultCanaryPercent)));
  const canaryCount = Math.max(1, Math.ceil((uniqueTargets.length * percent) / 100));
  return {
    allTargets: uniqueTargets,
    canaryTargets: uniqueTargets.slice(0, canaryCount),
  };
}

function createOtaRollout({ artifactVersion, targetDeviceIds = [], canaryPercent, actorId } = {}) {
  const normalizedArtifactVersion = String(artifactVersion || "").trim();
  if (!normalizedArtifactVersion) {
    return {
      status: "invalid",
      message: "artifactVersion is required.",
    };
  }
  const artifact = otaArtifactsByVersion.get(normalizedArtifactVersion);
  if (!artifact) {
    return {
      status: "not_found",
      message: "Artifact version not found.",
    };
  }

  const cohorts = pickCanaryDevices(targetDeviceIds, canaryPercent);
  if (cohorts.allTargets.length === 0) {
    return {
      status: "invalid",
      message: "At least one target device is required.",
    };
  }

  const rolloutId = createId("rollout");
  const rollout = {
    rolloutId,
    artifactVersion: normalizedArtifactVersion,
    status: "CANARY",
    canaryPercent: Math.round((cohorts.canaryTargets.length / cohorts.allTargets.length) * 100),
    targets: cohorts.allTargets,
    canaryTargets: cohorts.canaryTargets,
    promotedTargets: [],
    createdAt: new Date().toISOString(),
    actorId: String(actorId || "").trim() || null,
  };
  otaRolloutsById.set(rolloutId, rollout);
  return {
    status: "created",
    rollout,
  };
}

function advanceOtaRollout({ rolloutId, mode }) {
  const normalizedRolloutId = String(rolloutId || "").trim();
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (!normalizedRolloutId || !normalizedMode) {
    return {
      status: "invalid",
      message: "rolloutId and mode are required.",
    };
  }

  const rollout = otaRolloutsById.get(normalizedRolloutId);
  if (!rollout) {
    return {
      status: "not_found",
      message: "Rollout not found.",
    };
  }

  if (normalizedMode === "rollback") {
    const nextRollout = {
      ...rollout,
      status: "ROLLED_BACK",
      rolledBackAt: new Date().toISOString(),
      promotedTargets: [],
    };
    otaRolloutsById.set(normalizedRolloutId, nextRollout);
    return {
      status: "rolled_back",
      rollout: nextRollout,
    };
  }

  if (normalizedMode === "promote") {
    const nextRollout = {
      ...rollout,
      status: "COMPLETED",
      promotedTargets: [...rollout.targets],
      promotedAt: new Date().toISOString(),
    };
    otaRolloutsById.set(normalizedRolloutId, nextRollout);
    return {
      status: "promoted",
      rollout: nextRollout,
    };
  }

  return {
    status: "invalid",
    message: "mode must be promote or rollback.",
  };
}

function getOtaRollout(rolloutId) {
  const normalizedRolloutId = String(rolloutId || "").trim();
  if (!normalizedRolloutId) return null;
  return otaRolloutsById.get(normalizedRolloutId) || null;
}

function runDiagnostics({ deviceId, metrics = {} } = {}) {
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedDeviceId) {
    return {
      status: "invalid",
      message: "deviceId is required.",
    };
  }

  const normalizedMetrics = toObject(metrics);
  const issues = [];
  const suggestions = [];

  const batteryLevel = Number(normalizedMetrics.batteryLevel);
  if (Number.isFinite(batteryLevel) && batteryLevel < 15) {
    issues.push("Low battery");
    suggestions.push("Switch to low-power mode");
  }

  const offlineMinutes = Number(normalizedMetrics.offlineMinutes);
  if (Number.isFinite(offlineMinutes) && offlineMinutes > 10) {
    issues.push("Intermittent connectivity");
    suggestions.push("Restart network adapter");
  }

  const crashLoopCount = Number(normalizedMetrics.crashLoopCount);
  if (Number.isFinite(crashLoopCount) && crashLoopCount > 2) {
    issues.push("Application crash loop");
    suggestions.push("Restart application service");
  }

  return {
    status: "completed",
    diagnostics: {
      deviceId: normalizedDeviceId,
      issues,
      selfHealingActions: [...new Set(suggestions)],
      generatedAt: new Date().toISOString(),
    },
  };
}

function getSummary() {
  sweepCommandTimeouts(Date.now());
  const commandStatusCounts = {};
  for (const command of commandsById.values()) {
    commandStatusCounts[command.status] = (commandStatusCounts[command.status] || 0) + 1;
  }

  const rolloutStatusCounts = {};
  for (const rollout of otaRolloutsById.values()) {
    rolloutStatusCounts[rollout.status] = (rolloutStatusCounts[rollout.status] || 0) + 1;
  }

  return {
    totalCommands: commandsById.size,
    commandStatusCounts,
    totalArtifacts: otaArtifactsByVersion.size,
    totalRollouts: otaRolloutsById.size,
    rolloutStatusCounts,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  commandsById.clear();
  otaArtifactsByVersion.clear();
  otaRolloutsById.clear();
}

module.exports = {
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
  resetForTests,
  sweepCommandTimeouts,
  buildOtaSignature,
};
