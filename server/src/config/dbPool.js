/**
 * Database Pool Manager with Read Replicas
 * 
 * Supports primary (write) and replica (read) connections
 * for high-availability at 10 lakh+ scale
 */

const { Pool } = require('pg');
const LEADING_WRITE_QUERY_PATTERN = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|MERGE|VACUUM|REINDEX|GRANT|REVOKE|LOCK|REFRESH|DO)\b/i;
const WITH_QUERY_PATTERN = /^\s*WITH\b/i;
const CTE_WRITE_BODY_PATTERN = /\(\s*(INSERT|UPDATE|DELETE|MERGE)\b/i;
const WITH_MAIN_SELECT_PATTERN = /^\s*WITH\b[\s\S]*\)\s*SELECT\b/i;
const WRITE_QUERY_CLASSIFICATION_CACHE_MAX = (() => {
    const parsed = Number.parseInt(process.env.DB_WRITE_QUERY_CACHE_MAX, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 5000;
})();
const WRITE_QUERY_CACHE_SQL_MAX_LENGTH = (() => {
    const parsed = Number.parseInt(process.env.DB_WRITE_QUERY_CACHE_SQL_MAX_LENGTH, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 2048;
})();

// ============================================
// CONNECTION CONFIGURATION
// ============================================

// Primary database (for writes)
const primaryConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'mhub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: Number.parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// Read replicas configuration
// Can specify multiple replicas as comma-separated hosts
const replicaHosts = (process.env.DB_REPLICA_HOSTS || '').split(',').filter(h => h);

const replicaConfigs = replicaHosts.length > 0
    ? replicaHosts.map((host, index) => ({
        ...primaryConfig,
        host: host.trim(),
        port: Number.parseInt(process.env.DB_REPLICA_PORT, 10) || primaryConfig.port,
        max: Number.parseInt(process.env.DB_REPLICA_POOL_MAX, 10) || 10,
    }))
    : []; // No replicas configured

// ============================================
// CONNECTION POOLS
// ============================================

const primaryPool = new Pool(primaryConfig);
const replicaPools = replicaConfigs.map(config => new Pool(config));
const replicaPoolSet = new Set(replicaPools);
const writeQueryClassificationCache = new Map();

// Round-robin index for replica selection
let replicaIndex = 0;

// ============================================
// POOL HEALTH TRACKING
// ============================================
const poolHealth = {
    primary: { healthy: true, lastCheck: Date.now(), errors: 0 },
    replicas: replicaPools.map(() => ({ healthy: true, lastCheck: Date.now(), errors: 0 })),
};

// Log pool events
primaryPool.on('error', (err) => {
    console.error('[DB Primary] Pool error:', err.message);
    poolHealth.primary.healthy = false;
    poolHealth.primary.errors++;
});

primaryPool.on('connect', () => {
    poolHealth.primary.healthy = true;
    poolHealth.primary.lastCheck = Date.now();
});

replicaPools.forEach((pool, index) => {
    pool.on('error', (err) => {
        console.error(`[DB Replica ${index}] Pool error:`, err.message);
        poolHealth.replicas[index].healthy = false;
        poolHealth.replicas[index].errors++;
    });

    pool.on('connect', () => {
        poolHealth.replicas[index].healthy = true;
        poolHealth.replicas[index].lastCheck = Date.now();
    });
});

// ============================================
// QUERY ROUTING
// ============================================

/**
 * Get the appropriate pool for a query
 * - Writes (INSERT, UPDATE, DELETE, CREATE, DROP) go to primary
 * - Reads (SELECT) can go to replicas
 */
function getPool(query, forceWrite = false) {
    if (forceWrite || replicaPools.length === 0) {
        return primaryPool;
    }

    // Check if it's a write operation
    if (isWriteQuery(query)) {
        return primaryPool;
    }

    const healthyReplica = getNextHealthyReplicaPool();
    return healthyReplica || primaryPool;
}

function stripSqlComments(sql) {
    if (!sql) return '';
    const normalizedSql = String(sql);
    if (!normalizedSql.includes('--') && !normalizedSql.includes('/*')) {
        return normalizedSql.trim();
    }

    return normalizedSql
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/--.*$/gm, ' ')
        .trim();
}

function isWriteQuery(query) {
    const sql = stripSqlComments(query);
    if (!sql) return false;

    const cachedClassification = getCachedWriteQueryClassification(sql);
    if (cachedClassification !== null) {
        return cachedClassification;
    }

    const isWrite = classifyWriteQuery(sql);
    setCachedWriteQueryClassification(sql, isWrite);
    return isWrite;
}

function classifyWriteQuery(sql) {
    if (LEADING_WRITE_QUERY_PATTERN.test(sql)) {
        return true;
    }

    if (!WITH_QUERY_PATTERN.test(sql)) {
        return false;
    }

    // CTE that mutates data (e.g., WITH changed AS (UPDATE ... RETURNING ...))
    if (CTE_WRITE_BODY_PATTERN.test(sql)) {
        return true;
    }

    // Pure read CTE generally ends with a SELECT statement.
    return !WITH_MAIN_SELECT_PATTERN.test(sql);
}

function getCachedWriteQueryClassification(sql) {
    if (
        WRITE_QUERY_CLASSIFICATION_CACHE_MAX <= 0 ||
        WRITE_QUERY_CACHE_SQL_MAX_LENGTH <= 0 ||
        sql.length > WRITE_QUERY_CACHE_SQL_MAX_LENGTH
    ) {
        return null;
    }

    if (!writeQueryClassificationCache.has(sql)) {
        return null;
    }

    const value = writeQueryClassificationCache.get(sql);
    // Promote hot query signatures to keep cache useful under pressure.
    writeQueryClassificationCache.delete(sql);
    writeQueryClassificationCache.set(sql, value);
    return value;
}

function setCachedWriteQueryClassification(sql, isWrite) {
    if (
        WRITE_QUERY_CLASSIFICATION_CACHE_MAX <= 0 ||
        WRITE_QUERY_CACHE_SQL_MAX_LENGTH <= 0 ||
        sql.length > WRITE_QUERY_CACHE_SQL_MAX_LENGTH
    ) {
        return;
    }

    if (writeQueryClassificationCache.has(sql)) {
        writeQueryClassificationCache.delete(sql);
    } else if (writeQueryClassificationCache.size >= WRITE_QUERY_CLASSIFICATION_CACHE_MAX) {
        const oldestKey = writeQueryClassificationCache.keys().next().value;
        if (oldestKey !== undefined) {
            writeQueryClassificationCache.delete(oldestKey);
        }
    }

    writeQueryClassificationCache.set(sql, isWrite);
}

function getNextHealthyReplicaPool() {
    if (replicaPools.length === 0) {
        return null;
    }

    for (let attempt = 0; attempt < replicaPools.length; attempt += 1) {
        const candidateIndex = replicaIndex;
        replicaIndex = (replicaIndex + 1) % replicaPools.length;
        if (poolHealth.replicas[candidateIndex]?.healthy) {
            return replicaPools[candidateIndex];
        }
    }

    return null;
}

/**
 * Execute a query with automatic pool routing
 */
async function query(text, params, options = {}) {
    const pool = getPool(text, options.forceWrite);
    const start = Date.now();

    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        if (duration > 100) {
            console.log(`[DB] Slow query (${duration}ms)`, text.substring(0, 50) + '...');
        }

        return result;
    } catch (err) {
        console.error('[DB] Query error:', err.message);

        // If replica failed, try primary as fallback
        if (pool !== primaryPool && replicaPoolSet.has(pool)) {
            console.log('[DB] Retrying on primary after replica failure');
            return primaryPool.query(text, params);
        }

        throw err;
    }
}

/**
 * Execute a transaction (always on primary)
 */
async function transaction(callback) {
    const client = await primaryPool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ============================================
// HEALTH CHECK
// ============================================

async function healthCheck() {
    const results = {
        primary: null,
        replicas: [],
        overall: 'healthy',
    };

    // Check primary
    try {
        const start = Date.now();
        await primaryPool.query('SELECT 1');
        results.primary = {
            healthy: true,
            latency: Date.now() - start,
            pool: {
                total: primaryPool.totalCount,
                idle: primaryPool.idleCount,
                waiting: primaryPool.waitingCount,
            },
        };
        poolHealth.primary.healthy = true;
    } catch (err) {
        results.primary = { healthy: false, error: err.message };
        results.overall = 'degraded';
    }

    // Check replicas in parallel to avoid additive latency.
    const replicaHealthResults = await Promise.all(
        replicaPools.map(async (replicaPool, i) => {
            try {
                const start = Date.now();
                await replicaPool.query('SELECT 1');
                poolHealth.replicas[i].healthy = true;
                return {
                    index: i,
                    healthy: true,
                    latency: Date.now() - start,
                    pool: {
                        total: replicaPool.totalCount,
                        idle: replicaPool.idleCount,
                        waiting: replicaPool.waitingCount,
                    },
                };
            } catch (err) {
                poolHealth.replicas[i].healthy = false;
                return { index: i, healthy: false, error: err.message };
            }
        })
    );
    results.replicas = replicaHealthResults;

    // Overall status
    if (!results.primary.healthy) {
        results.overall = 'critical';
    } else if (results.replicas.some(r => !r.healthy)) {
        results.overall = 'degraded';
    }

    return results;
}

// ============================================
// STATS
// ============================================

function getStats() {
    return {
        primary: {
            total: primaryPool.totalCount,
            idle: primaryPool.idleCount,
            waiting: primaryPool.waitingCount,
            health: poolHealth.primary,
        },
        replicas: replicaPools.map((pool, i) => ({
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount,
            health: poolHealth.replicas[i],
        })),
        replicaCount: replicaPools.length,
        usingReplicas: replicaPools.length > 0,
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    query,
    transaction,
    healthCheck,
    getStats,
    isWriteQuery,
    // Direct pool access for compatibility
    primaryPool,
    replicaPools,
    // Legacy compatibility helpers
    connect: (...args) => primaryPool.connect(...args),
    on: (...args) => primaryPool.on(...args),
    end: async () => {
        await Promise.all([
            primaryPool.end(),
            ...replicaPools.map((pool) => pool.end()),
        ]);
    },
};
