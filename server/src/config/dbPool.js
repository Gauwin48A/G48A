/**
 * Database Pool Manager with Read Replicas
 * 
 * Supports primary (write) and replica (read) connections
 * for high-availability at 10 lakh+ scale
 */

const { Pool } = require('pg');

// ============================================
// CONNECTION CONFIGURATION
// ============================================

// Primary database (for writes)
const primaryConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mhub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX) || 20,
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
        port: parseInt(process.env.DB_REPLICA_PORT) || primaryConfig.port,
        max: parseInt(process.env.DB_REPLICA_POOL_MAX) || 10,
    }))
    : []; // No replicas configured

// ============================================
// CONNECTION POOLS
// ============================================

const primaryPool = new Pool(primaryConfig);
const replicaPools = replicaConfigs.map(config => new Pool(config));

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
    const isWriteOp = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|WITH\s+.*\s+AS\s+\()/i.test(query);

    if (isWriteOp) {
        return primaryPool;
    }

    // SELECT queries - use round-robin across healthy replicas
    const healthyReplicas = replicaPools.filter((_, i) => poolHealth.replicas[i].healthy);

    if (healthyReplicas.length === 0) {
        // No healthy replicas, use primary
        return primaryPool;
    }

    // Round-robin selection
    const selectedPool = healthyReplicas[replicaIndex % healthyReplicas.length];
    replicaIndex = (replicaIndex + 1) % healthyReplicas.length;

    return selectedPool;
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
        if (pool !== primaryPool && replicaPools.includes(pool)) {
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

    // Check replicas
    for (let i = 0; i < replicaPools.length; i++) {
        try {
            const start = Date.now();
            await replicaPools[i].query('SELECT 1');
            results.replicas.push({
                index: i,
                healthy: true,
                latency: Date.now() - start,
                pool: {
                    total: replicaPools[i].totalCount,
                    idle: replicaPools[i].idleCount,
                    waiting: replicaPools[i].waitingCount,
                },
            });
            poolHealth.replicas[i].healthy = true;
        } catch (err) {
            results.replicas.push({ index: i, healthy: false, error: err.message });
        }
    }

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
    // Direct pool access for compatibility
    primaryPool,
    replicaPools,
    // Legacy compatibility (acts as primary pool)
    ...primaryPool,
};
