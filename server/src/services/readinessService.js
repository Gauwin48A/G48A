const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { evaluateSchemaContract } = require('./schemaGuard');

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function evaluateRequiredConfig(env = process.env) {
    const required = ['JWT_SECRET', 'REFRESH_SECRET', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
    const missing = required.filter((key) => {
        const value = env[key];
        return value === undefined || value === null || String(value).trim() === '';
    });

    return {
        status: missing.length === 0 ? 'pass' : 'fail',
        required,
        missing
    };
}

async function evaluateSnapshot(env = process.env, now = new Date()) {
    const snapshotPathRaw = env.DIRECTORY_SNAPSHOT_PATH;
    if (!snapshotPathRaw) {
        return {
            status: 'skip',
            configured: false,
            reason: 'DIRECTORY_SNAPSHOT_PATH not configured'
        };
    }

    const snapshotPath = path.isAbsolute(snapshotPathRaw)
        ? snapshotPathRaw
        : path.resolve(process.cwd(), snapshotPathRaw);

    let stats;
    try {
        await fsp.access(snapshotPath, fs.constants.F_OK);
        stats = await fsp.stat(snapshotPath);
    } catch {
        return {
            status: 'fail',
            configured: true,
            path: snapshotPath,
            reason: 'snapshot file not found'
        };
    }

    const ageHours = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60);
    const parsedMaxAgeHours = Number.parseInt(env.DIRECTORY_SNAPSHOT_MAX_AGE_HOURS || '72', 10);
    const maxAgeHours = Number.isFinite(parsedMaxAgeHours) && parsedMaxAgeHours >= 0
        ? parsedMaxAgeHours
        : 72;
    const fresh = Number.isFinite(ageHours) && ageHours <= maxAgeHours;

    return {
        status: fresh ? 'pass' : 'warn',
        configured: true,
        path: snapshotPath,
        lastModified: stats.mtime.toISOString(),
        ageHours: Number(ageHours.toFixed(2)),
        maxAgeHours
    };
}

async function evaluateDb(pool) {
    const started = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            status: 'pass',
            latencyMs: Date.now() - started
        };
    } catch (err) {
        return {
            status: 'fail',
            latencyMs: Date.now() - started,
            error: err.message
        };
    }
}

async function evaluateCache(cacheService, env = process.env) {
    if (!cacheService || typeof cacheService.healthCheck !== 'function') {
        return {
            status: 'skip',
            reason: 'cache health check unavailable'
        };
    }

    try {
        const health = await cacheService.healthCheck();
        const normalizedStatus = String(health?.status || '').trim().toLowerCase();
        const hasBooleanHealthy = typeof health?.healthy === 'boolean';
        const isPass = hasBooleanHealthy
            ? health.healthy
            : (normalizedStatus === 'healthy' || normalizedStatus === 'pass');
        const usingMemoryFallback = String(health?.type || '').toLowerCase() === 'memory';
        const allowMemoryFallback = parseBoolean(
            env.READINESS_ALLOW_MEMORY_CACHE_FALLBACK,
            env.NODE_ENV !== 'production'
        );

        if (usingMemoryFallback && !allowMemoryFallback) {
            return {
                status: env.NODE_ENV === 'production' ? 'fail' : 'warn',
                details: health,
                reason: 'memory cache fallback is not allowed by readiness policy'
            };
        }

        return {
            status: isPass ? 'pass' : 'warn',
            details: health
        };
    } catch (err) {
        return {
            status: 'warn',
            error: err.message
        };
    }
}

async function evaluateSchema() {
  try {
    const report = await evaluateSchemaContract({ autoCreateTwoFactorFallback: false });
    const status = report.status === 'warn' ? 'pass' : report.status;
    return {
      status,
      details: report,
      warning: report.status === 'warn' ? report.twoFactor?.warning : null
    };
  } catch (err) {
    return {
      status: 'fail',
      error: err.message
    };
  }
}

function evaluateSessionStore(sessionStore, env = process.env) {
    if (!sessionStore || typeof sessionStore.isRedisAvailable !== 'function') {
        return {
            status: 'skip',
            mode: 'unknown',
            reason: 'session store capability unavailable'
        };
    }

    const redisAvailable = Boolean(sessionStore.isRedisAvailable());
    const allowMemoryFallback = parseBoolean(
        env.READINESS_ALLOW_MEMORY_SESSION_FALLBACK,
        env.NODE_ENV !== 'production'
    );
    if (!redisAvailable && allowMemoryFallback) {
        return {
            status: 'pass',
            mode: 'memory-fallback',
            reason: 'memory fallback explicitly allowed for readiness scenario'
        };
    }

    return {
        status: redisAvailable ? 'pass' : (env.NODE_ENV === 'production' ? 'fail' : 'warn'),
        mode: redisAvailable ? 'redis' : 'memory-fallback'
    };
}

async function runReadinessChecks({ pool, cacheService, sessionStore, env = process.env, now = new Date() }) {
  const checks = {
    requiredConfig: evaluateRequiredConfig(env),
    db: await evaluateDb(pool),
    schema: await evaluateSchema(),
    cache: await evaluateCache(cacheService, env),
    sessionStore: evaluateSessionStore(sessionStore, env),
    snapshot: await evaluateSnapshot(env, now)
  };

  const hasHardFailure =
    checks.requiredConfig.status === 'fail'
    || checks.db.status === 'fail'
    || checks.schema.status === 'fail'
    || checks.cache.status === 'fail'
    || checks.sessionStore.status === 'fail';
  const hasWarn = Object.values(checks).some((value) => value.status === 'warn');
  const status = hasHardFailure ? 'not_ready' : hasWarn ? 'degraded' : 'ready';

    return {
        status,
        checks,
        checkedAt: new Date().toISOString()
    };
}

module.exports = {
    evaluateRequiredConfig,
    evaluateSnapshot,
    runReadinessChecks
};
