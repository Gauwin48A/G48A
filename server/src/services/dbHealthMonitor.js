/**
 * Database Health Monitor
 * 
 * Tracks PostgreSQL health metrics:
 *   - Connection pool status (active, idle, waiting)
 *   - Query performance (avg, p95, slow queries)
 *   - Table sizes and row counts
 *   - Connection health checks
 *   - Dead tuple monitoring
 *   - Index usage statistics
 * 
 * Runs periodic health checks (configurable interval).
 */

const logger = require('../utils/logger');
const dbPool = require('../config/dbPool');

// ── Health History (circular buffer) ───────────────────────────
const healthHistory = [];
const MAX_HISTORY = 100;

// ── Query Performance Tracker ──────────────────────────────────
const queryStats = {
    totalQueries: 0,
    slowQueries: 0,
    failedQueries: 0,
    totalTime: 0,
    recentDurations: [],
};

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.MONITOR_DB_QUERY_MS || '200', 10);

/**
 * Track a query's execution time (call after each query).
 */
function trackQuery(durationMs, isError = false) {
    queryStats.totalQueries++;
    queryStats.totalTime += durationMs;
    if (isError) queryStats.failedQueries++;
    if (durationMs > SLOW_QUERY_THRESHOLD_MS) queryStats.slowQueries++;
    queryStats.recentDurations.push(durationMs);
    if (queryStats.recentDurations.length > 500) {
        queryStats.recentDurations = queryStats.recentDurations.slice(-500);
    }
}

/**
 * Run a comprehensive database health check.
 */
async function checkHealth() {
    const startTime = Date.now();
    const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {},
    };

    try {
        // ── 1. Basic Connectivity ──────────────────────────
        const connectStart = Date.now();
        const timeResult = await dbPool.query('SELECT NOW() as server_time, pg_postmaster_start_time() as server_start');
        health.checks.connectivity = {
            status: 'ok',
            serverTime: timeResult.rows[0].server_time,
            serverStartTime: timeResult.rows[0].server_start,
            latencyMs: Date.now() - connectStart,
        };

        // ── 2. Connection Pool Stats ───────────────────────
        const poolStats = {
            totalCount: dbPool.primaryPool?.totalCount || 0,
            idleCount: dbPool.primaryPool?.idleCount || 0,
            waitingCount: dbPool.primaryPool?.waitingCount || 0,
        };
        health.checks.connectionPool = {
            status: poolStats.waitingCount > 5 ? 'degraded' : 'ok',
            ...poolStats,
        };

        // ── 3. Active Queries ──────────────────────────────
        const activeResult = await dbPool.query(`
            SELECT COUNT(*) as active_queries,
                   COUNT(*) FILTER (WHERE state = 'active') as truly_active,
                   COUNT(*) FILTER (WHERE state = 'idle') as idle,
                   COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
            FROM pg_stat_activity
            WHERE datname = current_database()
        `);
        const active = activeResult.rows[0];
        health.checks.activeQueries = {
            status: parseInt(active.truly_active) > 20 ? 'degraded' : 'ok',
            total: parseInt(active.active_queries),
            active: parseInt(active.truly_active),
            idle: parseInt(active.idle),
            idleInTransaction: parseInt(active.idle_in_transaction),
        };

        // ── 4. Long-Running Queries ────────────────────────
        const longRunning = await dbPool.query(`
            SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
            FROM pg_stat_activity
            WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
            AND datname = current_database()
            ORDER BY duration DESC
            LIMIT 5
        `);
        health.checks.longRunningQueries = {
            status: longRunning.rows.length > 0 ? 'warning' : 'ok',
            count: longRunning.rows.length,
            queries: longRunning.rows.map(r => ({
                pid: r.pid,
                duration: r.duration,
                query: r.query?.substring(0, 100),
                state: r.state,
            })),
        };

        // ── 5. Database Size ───────────────────────────────
        const sizeResult = await dbPool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `);
        health.checks.databaseSize = {
            status: 'ok',
            size: sizeResult.rows[0].size,
        };

        // ── 6. Table Sizes (top 10 by total size) ──────────
        const tableSizes = await dbPool.query(`
            SELECT 
                schemaname || '.' || tablename as table_name,
                pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
                pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
                pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename::regclass)) as index_size,
                (SELECT reltuples::bigint FROM pg_class WHERE oid = (schemaname || '.' || tablename)::regclass) as row_estimate
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
            LIMIT 10
        `);
        health.checks.tableSizes = {
            status: 'ok',
            tables: tableSizes.rows,
        };

        // ── 7. Index Usage Stats ───────────────────────────
        const indexStats = await dbPool.query(`
            SELECT 
                indexrelname as index_name,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) as size
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 10
        `);
        health.checks.indexUsage = {
            status: 'ok',
            indexes: indexStats.rows,
        };

        // ── 8. Dead Tuples (bloat indicator) ───────────────
        const deadTuples = await dbPool.query(`
            SELECT 
                relname as table_name,
                n_dead_tup,
                n_live_tup,
                CASE WHEN n_live_tup > 0 
                    THEN ROUND(n_dead_tup * 100.0 / n_live_tup, 2)
                    ELSE 0 
                END as dead_pct,
                last_autovacuum,
                last_autoanalyze
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 100
            ORDER BY n_dead_tup DESC
            LIMIT 10
        `);
        health.checks.deadTuples = {
            status: deadTuples.rows.some(r => parseFloat(r.dead_pct) > 20) ? 'warning' : 'ok',
            tables: deadTuples.rows,
        };

        // ── 9. Query Performance Summary ───────────────────
        const sorted = [...queryStats.recentDurations].sort((a, b) => a - b);
        const percentile = (arr, p) => arr.length ? arr[Math.floor(arr.length * p / 100)] : 0;
        health.checks.queryPerformance = {
            status: queryStats.slowQueries > queryStats.totalQueries * 0.1 ? 'warning' : 'ok',
            totalQueries: queryStats.totalQueries,
            slowQueries: queryStats.slowQueries,
            failedQueries: queryStats.failedQueries,
            avgMs: queryStats.totalQueries > 0 ? Math.round(queryStats.totalTime / queryStats.totalQueries) : 0,
            p50: percentile(sorted, 50),
            p95: percentile(sorted, 95),
            p99: percentile(sorted, 99),
        };

        // ── 10. Replication Lag (if replicas exist) ─────────
        try {
            const replResult = await dbPool.query(`
                SELECT client_addr, state, sent_lsn, replay_lsn,
                       CASE WHEN sent_lsn IS NOT NULL AND replay_lsn IS NOT NULL
                           THEN pg_wal_lsn_diff(sent_lsn, replay_lsn)
                           ELSE 0 
                       END AS replay_lag_bytes
                FROM pg_stat_replication
                LIMIT 5
            `);
            health.checks.replication = {
                status: 'ok',
                replicas: replResult.rows,
            };
        } catch {
            // Not a primary with replicas — skip
            health.checks.replication = { status: 'not_applicable' };
        }

    } catch (err) {
        health.status = 'unhealthy';
        health.checks.error = { status: 'error', message: err.message };
        logger.error('[DB Health] Health check failed:', err.message);
    }

    health.totalCheckMs = Date.now() - startTime;

    // Store in history
    healthHistory.push(health);
    if (healthHistory.length > MAX_HISTORY) {
        healthHistory.shift();
    }

    return health;
}

/**
 * Get health history.
 */
function getHealthHistory() {
    return healthHistory;
}

/**
 * Get the latest health check result.
 */
function getLatestHealth() {
    return healthHistory[healthHistory.length - 1] || null;
}

/**
 * Get query performance stats.
 */
function getQueryStats() {
    const sorted = [...queryStats.recentDurations].sort((a, b) => a - b);
    const percentile = (arr, p) => arr.length ? arr[Math.floor(arr.length * p / 100)] : 0;
    return {
        totalQueries: queryStats.totalQueries,
        slowQueries: queryStats.slowQueries,
        failedQueries: queryStats.failedQueries,
        avgMs: queryStats.totalQueries > 0 ? Math.round(queryStats.totalTime / queryStats.totalQueries) : 0,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
    };
}

module.exports = {
    checkHealth,
    getHealthHistory,
    getLatestHealth,
    getQueryStats,
    trackQuery,
};
