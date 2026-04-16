#!/usr/bin/env node

const pool = require('../src/config/db');
const { ensureSchemaPreflight, ensureUserTierColumns } = require('../src/services/schemaGuard');
const sessionStore = require('../src/config/redisSession');
const cacheLayer = require('../src/config/redisCache');

const isProduction = process.env.NODE_ENV === 'production';

function parseBoolean(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function collectIssues(report) {
  const issues = [];
  if (!report || typeof report !== 'object') {
    return issues;
  }

  for (const [tableName, check] of Object.entries(report.tableChecks || {})) {
    if (!check.exists) {
      issues.push(`table missing: ${tableName}`);
      continue;
    }
    if (Array.isArray(check.missingColumns) && check.missingColumns.length > 0) {
      issues.push(`${tableName} missing columns: ${check.missingColumns.join(', ')}`);
    }
  }

  if (report.twoFactor?.mode === 'unavailable') {
    issues.push('2FA storage unavailable (users 2FA columns missing and fallback table invalid/missing)');
  }

  return issues;
}

async function closePool() {
  try {
    await pool.end();
  } catch {
    // Ignore close errors so original failure is preserved.
  }
}

async function closeInfra() {
  await Promise.allSettled([
    closePool(),
    cacheLayer.close?.(),
    sessionStore.close?.()
  ]);
}

async function ensureRedisForProduction() {
  const requireRedis = parseBoolean(process.env.REQUIRE_REDIS_IN_PRODUCTION, true);
  if (!isProduction || !requireRedis) {
    return;
  }

  const timeoutMs = Number.parseInt(process.env.PREFLIGHT_REDIS_TIMEOUT_MS || '5000', 10) || 5000;
  const pollMs = Number.parseInt(process.env.PREFLIGHT_REDIS_POLL_MS || '250', 10) || 250;
  const startedAt = Date.now();
  let lastSessionReady = false;
  let lastCacheType = 'unknown';

  while (Date.now() - startedAt <= timeoutMs) {
    lastSessionReady = Boolean(sessionStore.isRedisAvailable?.());
    try {
      const cacheHealth = await cacheLayer.healthCheck?.();
      lastCacheType = String(cacheHealth?.type || 'unknown').toLowerCase();
    } catch {
      lastCacheType = 'unknown';
    }

    if (lastSessionReady && lastCacheType === 'redis') {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    `Redis readiness failed in production mode (sessionReady=${lastSessionReady}, cacheType=${lastCacheType}).`
  );
}

async function main() {
  try {
    const report = await ensureSchemaPreflight({
      strict: true,
      autoCreateTwoFactorFallback: true
    });

    await ensureUserTierColumns();
    await ensureRedisForProduction();

    console.log('[preflight:schema] passed');
    if (report.status === 'warn' && report.twoFactor?.warning) {
      console.log(`[preflight:schema] warning: ${report.twoFactor.warning}`);
    }

    await closeInfra();
  } catch (error) {
    console.error('[preflight:schema] failed');
    const issues = collectIssues(error.report);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    if (!issues.length) {
      console.error(`- ${error.message}`);
    }

    await closeInfra();
    process.exit(1);
  }
}

main();
