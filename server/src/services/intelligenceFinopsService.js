const crypto = require("crypto");

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parsePositiveNumber(rawValue, fallback) {
  const parsed = Number.parseFloat(String(rawValue));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
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
    healthAnomalyThreshold: parsePositiveInteger(
      process.env.INTELLIGENCE_HEALTH_ANOMALY_THRESHOLD || "40",
      40
    ),
    energySavingsTargetPercent: parsePositiveInteger(
      process.env.INTELLIGENCE_ENERGY_SAVINGS_TARGET_PERCENT || "15",
      15
    ),
    finopsCostAlertUsd: parsePositiveNumber(process.env.FINOPS_COST_ALERT_USD || "1000", 1000),
    experimentRollbackThresholdPercent: parsePositiveNumber(
      process.env.EXPERIMENT_AUTO_ROLLBACK_THRESHOLD_PERCENT || "5",
      5
    ),
  };
}

const healthByDeviceId = new Map();
const maintenanceRecommendations = [];
const energyOptimizations = [];
const tenantCostById = new Map();
const experimentsById = new Map();

function scoreHealth(metrics = {}) {
  const uptimePercent = Number(metrics.uptimePercent ?? metrics.uptime_percent ?? 100);
  const errorRatePercent = Number(metrics.errorRatePercent ?? metrics.error_rate_percent ?? 0);
  const latencyMs = Number(metrics.latencyMs ?? metrics.latency_ms ?? 0);
  const temperatureC = Number(metrics.temperatureC ?? metrics.temperature_c ?? 0);

  let score = 100;
  if (Number.isFinite(uptimePercent)) {
    score -= Math.max(0, (100 - uptimePercent) * 0.6);
  }
  if (Number.isFinite(errorRatePercent)) {
    score -= Math.max(0, errorRatePercent * 1.5);
  }
  if (Number.isFinite(latencyMs) && latencyMs > 150) {
    score -= (latencyMs - 150) * 0.05;
  }
  if (Number.isFinite(temperatureC) && temperatureC > 75) {
    score -= (temperatureC - 75) * 0.8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ingestHealthSignal(input = {}) {
  const deviceId = String(input.deviceId || input.device_id || "").trim();
  const tenantId = String(input.tenantId || input.tenant_id || "").trim() || null;
  const metrics = toObject(input.metrics);
  if (!deviceId) {
    return {
      status: "invalid",
      message: "deviceId is required.",
    };
  }

  const healthScore = scoreHealth(metrics);
  const policy = resolvePolicy();
  const health = {
    deviceId,
    tenantId,
    healthScore,
    anomaly: healthScore < policy.healthAnomalyThreshold,
    metrics,
    updatedAt: new Date().toISOString(),
  };
  healthByDeviceId.set(deviceId, health);
  return {
    status: "ingested",
    health,
  };
}

function getDeviceHealth(deviceId) {
  const normalized = String(deviceId || "").trim();
  if (!normalized) return null;
  return healthByDeviceId.get(normalized) || null;
}

function recommendMaintenance(input = {}) {
  const deviceId = String(input.deviceId || input.device_id || "").trim();
  if (!deviceId) {
    return {
      status: "invalid",
      message: "deviceId is required.",
    };
  }

  const recentFailures = parsePositiveInteger(input.recentFailures || input.recent_failures || "0", 0);
  const offlineMinutes = parsePositiveInteger(input.offlineMinutes || input.offline_minutes || "0", 0);
  const health = getDeviceHealth(deviceId);
  const baseRisk = health ? Math.max(0, 100 - health.healthScore) : 50;
  const riskScore = Math.min(100, baseRisk + recentFailures * 5 + Math.round(offlineMinutes / 2));

  const actions = [];
  if (riskScore >= 70) actions.push("Schedule maintenance in <24h");
  if (recentFailures >= 3) actions.push("Replace unstable component");
  if (offlineMinutes >= 15) actions.push("Inspect connectivity module");
  if (actions.length === 0) actions.push("Continue routine monitoring");

  const recommendation = {
    recommendationId: createId("maint"),
    deviceId,
    riskScore,
    actions,
    generatedAt: new Date().toISOString(),
  };
  maintenanceRecommendations.push(recommendation);
  return {
    status: "generated",
    recommendation,
  };
}

function evaluateEnergyOptimization(input = {}) {
  const deviceId = String(input.deviceId || input.device_id || "").trim();
  const baselineWh = parsePositiveNumber(input.baselineWh || input.baseline_wh || "0", 0);
  const currentWh = parsePositiveNumber(input.currentWh || input.current_wh || "0", 0);
  const networkMb = parsePositiveNumber(input.networkMb || input.network_mb || "1", 1);
  if (!deviceId || !baselineWh || !currentWh) {
    return {
      status: "invalid",
      message: "deviceId, baselineWh, and currentWh are required.",
    };
  }

  const savingsPercent = Number((((baselineWh - currentWh) / baselineWh) * 100).toFixed(2));
  const policy = resolvePolicy();
  const recommendation = {
    optimizationId: createId("energy"),
    deviceId,
    baselineWh,
    currentWh,
    networkMb,
    savingsPercent,
    targetPercent: policy.energySavingsTargetPercent,
    meetsTarget: savingsPercent >= policy.energySavingsTargetPercent,
    actions:
      savingsPercent >= policy.energySavingsTargetPercent
        ? ["Keep optimization profile"]
        : ["Reduce telemetry sampling frequency", "Enable low-power transport mode"],
    evaluatedAt: new Date().toISOString(),
  };
  energyOptimizations.push(recommendation);
  return {
    status: "evaluated",
    recommendation,
  };
}

function recordCostUsage(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const workload = String(input.workload || "").trim();
  const costUsd = parsePositiveNumber(input.costUsd || input.cost_usd || "0", 0);
  const units = parsePositiveNumber(input.units || "1", 1);
  if (!tenantId || !workload || !costUsd) {
    return {
      status: "invalid",
      message: "tenantId, workload, and costUsd are required.",
    };
  }

  const existing = tenantCostById.get(tenantId) || {
    tenantId,
    totalCostUsd: 0,
    totalUnits: 0,
    workloads: {},
    entries: 0,
    updatedAt: null,
  };

  const next = {
    ...existing,
    totalCostUsd: Number((existing.totalCostUsd + costUsd).toFixed(2)),
    totalUnits: Number((existing.totalUnits + units).toFixed(2)),
    workloads: {
      ...existing.workloads,
      [workload]: Number((((existing.workloads[workload] || 0) + costUsd)).toFixed(2)),
    },
    entries: existing.entries + 1,
    updatedAt: new Date().toISOString(),
  };
  tenantCostById.set(tenantId, next);

  const policy = resolvePolicy();
  return {
    status: "recorded",
    ledger: {
      ...next,
      alert: next.totalCostUsd >= policy.finopsCostAlertUsd,
      alertThresholdUsd: policy.finopsCostAlertUsd,
    },
  };
}

function getTenantCost(tenantId) {
  const normalized = String(tenantId || "").trim();
  if (!normalized) return null;
  return tenantCostById.get(normalized) || null;
}

function evaluateExperiment(input = {}) {
  const experimentId = String(input.experimentId || input.experiment_id || "").trim() || createId("exp");
  const metricName = String(input.metricName || input.metric_name || "kpi").trim();
  const before = Number(input.kpiBefore ?? input.kpi_before);
  const after = Number(input.kpiAfter ?? input.kpi_after);
  const higherIsBetter = input.higherIsBetter === undefined ? true : Boolean(input.higherIsBetter);
  if (!Number.isFinite(before) || !Number.isFinite(after)) {
    return {
      status: "invalid",
      message: "kpiBefore and kpiAfter are required numbers.",
    };
  }

  const deltaPercent = before === 0 ? 0 : Number((((after - before) / before) * 100).toFixed(2));
  const degradationPercent = higherIsBetter ? Math.max(0, -deltaPercent) : Math.max(0, deltaPercent);
  const policy = resolvePolicy();
  const rollback = degradationPercent > policy.experimentRollbackThresholdPercent;

  const experiment = {
    experimentId,
    metricName,
    before,
    after,
    deltaPercent,
    degradationPercent,
    rollback,
    rollbackThresholdPercent: policy.experimentRollbackThresholdPercent,
    evaluatedAt: new Date().toISOString(),
  };
  experimentsById.set(experimentId, experiment);
  return {
    status: "evaluated",
    experiment,
  };
}

function getSummary() {
  const anomalies = Array.from(healthByDeviceId.values()).filter((entry) => entry.anomaly).length;
  const rollbackRecommended = Array.from(experimentsById.values()).filter((entry) => entry.rollback).length;
  return {
    devicesScored: healthByDeviceId.size,
    anomalies,
    maintenanceRecommendations: maintenanceRecommendations.length,
    energyOptimizations: energyOptimizations.length,
    finopsTenants: tenantCostById.size,
    experiments: experimentsById.size,
    rollbackRecommended,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  healthByDeviceId.clear();
  maintenanceRecommendations.splice(0, maintenanceRecommendations.length);
  energyOptimizations.splice(0, energyOptimizations.length);
  tenantCostById.clear();
  experimentsById.clear();
}

module.exports = {
  ingestHealthSignal,
  getDeviceHealth,
  recommendMaintenance,
  evaluateEnergyOptimization,
  recordCostUsage,
  getTenantCost,
  evaluateExperiment,
  getSummary,
  resetForTests,
};
