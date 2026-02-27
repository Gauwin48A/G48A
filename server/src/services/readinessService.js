const fs = require('fs');
const path = require('path');

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

function evaluateSnapshot(env = process.env, now = new Date()) {
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

    if (!fs.existsSync(snapshotPath)) {
        return {
            status: 'fail',
            configured: true,
            path: snapshotPath,
            reason: 'snapshot file not found'
        };
    }

    const stats = fs.statSync(snapshotPath);
    const ageHours = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60);
    const maxAgeHours = Number.parseInt(env.DIRECTORY_SNAPSHOT_MAX_AGE_HOURS || '72', 10);
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

async function evaluateCache(cacheService) {
    if (!cacheService || typeof cacheService.healthCheck !== 'function') {
        return {
            status: 'skip',
            reason: 'cache health check unavailable'
        };
    }

    try {
        const health = await cacheService.healthCheck();
        const isPass = health?.status === 'healthy';
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

function evaluateSessionStore(sessionStore) {
    if (!sessionStore || typeof sessionStore.isRedisAvailable !== 'function') {
        return {
            status: 'skip',
            mode: 'unknown',
            reason: 'session store capability unavailable'
        };
    }

    const redisAvailable = Boolean(sessionStore.isRedisAvailable());
    return {
        status: redisAvailable ? 'pass' : 'warn',
        mode: redisAvailable ? 'redis' : 'memory-fallback'
    };
}

async function runReadinessChecks({ pool, cacheService, sessionStore, env = process.env, now = new Date() }) {
    const checks = {
        requiredConfig: evaluateRequiredConfig(env),
        db: await evaluateDb(pool),
        cache: await evaluateCache(cacheService),
        sessionStore: evaluateSessionStore(sessionStore),
        snapshot: evaluateSnapshot(env, now)
    };

    const hasHardFailure = checks.requiredConfig.status === 'fail' || checks.db.status === 'fail';
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
