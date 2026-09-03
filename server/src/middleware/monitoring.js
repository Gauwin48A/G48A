/**
 * API Monitoring Middleware
 * 
 * Tracks for every request:
 *   - Response time (ms)
 *   - Status code
 *   - Error rate
 *   - Request count per endpoint
 *   - Slow query detection (>500ms)
 *   - Memory usage snapshots
 * 
 * Data is stored in-memory with circular buffers (no external dependencies).
 * Exposed via /api/monitoring/* endpoints.
 */

const logger = require('../utils/logger');

// ── Circular Buffer (fixed-size, O(1) push) ────────────────────
class CircularBuffer {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.index = 0;
    }
    push(item) {
        if (this.buffer.length < this.maxSize) {
            this.buffer.push(item);
        } else {
            this.buffer[this.index] = item;
        }
        this.index = (this.index + 1) % this.maxSize;
    }
    getAll() { return this.buffer; }
    getRecent(n) { return this.buffer.slice(-n); }
    size() { return this.buffer.length; }
}

// ── In-Memory Metrics Store ────────────────────────────────────
const metrics = {
    // Request-level data
    requests: new CircularBuffer(5000),
    errors: new CircularBuffer(2000),
    slowQueries: new CircularBuffer(500),

    // Aggregated counters (resettable)
    counters: {
        totalRequests: 0,
        totalErrors: 0,
        totalSuccess: 0,
        total4xx: 0,
        total5xx: 0,
        startTime: Date.now(),
    },

    // Per-endpoint stats: { "GET /api/posts": { count, totalTime, errors, lastSeen } }
    endpoints: new Map(),

    // Alert history
    alerts: new CircularBuffer(200),

    // Thresholds
    thresholds: {
        slowRequestMs: parseInt(process.env.MONITOR_SLOW_REQUEST_MS || '500', 10),
        errorRatePercent: parseInt(process.env.MONITOR_ERROR_RATE_PERCENT || '10', 10),
        errorRateWindow: parseInt(process.env.MONITOR_ERROR_RATE_WINDOW || '60', 10), // seconds
        maxMemoryMB: parseInt(process.env.MONITOR_MAX_MEMORY_MB || '1024', 10),
        dbQueryMs: parseInt(process.env.MONITOR_DB_QUERY_MS || '200', 10),
    },
};

// ── Alert Emitter ──────────────────────────────────────────────
function emitAlert(severity, type, message, details = {}) {
    const alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        severity, // 'warning', 'critical', 'info'
        type,     // 'slow_request', 'high_error_rate', 'memory', 'db_slow'
        message,
        details,
        timestamp: new Date().toISOString(),
    };
    metrics.alerts.push(alert);
    logger.warn(`[MONITOR][${severity.toUpperCase()}] ${type}: ${message}`);
    return alert;
}

// ── Middleware Factory ──────────────────────────────────────────
function monitoringMiddleware(req, res, next) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Capture original end to measure response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // ── Record request ──────────────────────────────────
        const record = {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            duration,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']?.substring(0, 100),
            userId: req.user?.userId || req.user?.id || null,
            contentLength: parseInt(res.getHeader('content-length') || '0', 10),
        };

        metrics.requests.push(record);
        metrics.counters.totalRequests++;

        // ── Status code buckets ────────────────────────────
        if (statusCode >= 500) {
            metrics.counters.total5xx++;
            metrics.counters.totalErrors++;
            metrics.errors.push({ ...record, errorType: '5xx' });
        } else if (statusCode >= 400) {
            metrics.counters.total4xx++;
            metrics.counters.totalErrors++;
            metrics.errors.push({ ...record, errorType: '4xx' });
        } else {
            metrics.counters.totalSuccess++;
        }

        // ── Per-endpoint aggregation ───────────────────────
        const endpointKey = `${req.method} ${req.route?.path || req.path}`;
        if (!metrics.endpoints.has(endpointKey)) {
            metrics.endpoints.set(endpointKey, {
                count: 0, totalTime: 0, errors: 0,
                p50: 0, p95: 0, p99: 0,
                recentDurations: new CircularBuffer(200),
                lastSeen: null,
            });
        }
        const ep = metrics.endpoints.get(endpointKey);
        ep.count++;
        ep.totalTime += duration;
        ep.recentDurations.push(duration);
        ep.lastSeen = new Date().toISOString();
        if (statusCode >= 400) ep.errors++;

        // ── Slow query detection ───────────────────────────
        if (duration > metrics.thresholds.slowRequestMs) {
            const slowEntry = {
                method: req.method,
                path: req.originalUrl || req.url,
                duration,
                statusCode,
                timestamp: new Date().toISOString(),
            };
            metrics.slowQueries.push(slowEntry);
            emitAlert('warning', 'slow_request',
                `${req.method} ${req.path} took ${duration}ms (threshold: ${metrics.thresholds.slowRequestMs}ms)`,
                slowEntry
            );
        }

        // ── Memory check ───────────────────────────────────
        const currentMemory = process.memoryUsage();
        const heapUsedMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
        if (heapUsedMB > metrics.thresholds.maxMemoryMB) {
            emitAlert('critical', 'memory',
                `Heap usage ${heapUsedMB}MB exceeds threshold ${metrics.thresholds.maxMemoryMB}MB`,
                { heapUsedMB, rssMB: Math.round(currentMemory.rss / 1024 / 1024) }
            );
        }

        // ── High error rate check (per-minute window) ──────
        const windowStart = Date.now() - (metrics.thresholds.errorRateWindow * 1000);
        const recentRequests = metrics.requests.getAll()
            .filter(r => new Date(r.timestamp).getTime() > windowStart);
        if (recentRequests.length >= 10) {
            const recentErrors = recentRequests.filter(r => r.statusCode >= 500).length;
            const errorRate = (recentErrors / recentRequests.length) * 100;
            if (errorRate > metrics.thresholds.errorRatePercent) {
                emitAlert('critical', 'high_error_rate',
                    `5xx error rate ${errorRate.toFixed(1)}% exceeds threshold ${metrics.thresholds.errorRatePercent}% (${recentErrors}/${recentRequests.length} in ${metrics.thresholds.errorRateWindow}s window)`,
                    { errorRate, recentErrors, totalRecent: recentRequests.length }
                );
            }
        }

        originalEnd.apply(res, args);
    };

    next();
}

// ── Get Aggregated Metrics ─────────────────────────────────────
function getMetrics() {
    const now = Date.now();
    const uptimeMs = now - metrics.counters.startTime;
    const uptimeHours = (uptimeMs / 3600000).toFixed(2);

    // Calculate percentiles from recent requests
    const recentDurations = metrics.requests.getRecent(200).map(r => r.duration).sort((a, b) => a - b);
    const percentile = (arr, p) => arr.length ? arr[Math.floor(arr.length * p / 100)] : 0;

    // Error rate (last 60 seconds)
    const windowStart = now - 60000;
    const recentReqs = metrics.requests.getAll().filter(r => new Date(r.timestamp).getTime() > windowStart);
    const recentErrs = recentReqs.filter(r => r.statusCode >= 500).length;
    const errorRate = recentReqs.length > 0 ? ((recentErrs / recentReqs.length) * 100).toFixed(1) : '0.0';

    // Memory
    const mem = process.memoryUsage();

    return {
        uptime: `${uptimeHours}h`,
        uptimeMs,
        memory: {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
            externalMB: Math.round(mem.external / 1024 / 1024),
        },
        requests: {
            total: metrics.counters.totalRequests,
            success: metrics.counters.totalSuccess,
            errors4xx: metrics.counters.total4xx,
            errors5xx: metrics.counters.total5xx,
            errorRate: `${errorRate}%`,
            requestsPerMinute: recentReqs.length,
        },
        responseTime: {
            p50: percentile(recentDurations, 50),
            p95: percentile(recentDurations, 95),
            p99: percentile(recentDurations, 99),
            avg: recentDurations.length > 0
                ? Math.round(recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length)
                : 0,
            max: percentile(recentDurations, 100),
        },
        endpoints: Array.from(metrics.endpoints.entries()).map(([key, val]) => ({
            endpoint: key,
            count: val.count,
            avgMs: Math.round(val.totalTime / val.count),
            errors: val.errors,
            errorRate: val.count > 0 ? ((val.errors / val.count) * 100).toFixed(1) + '%' : '0%',
            lastSeen: val.lastSeen,
        })).sort((a, b) => b.count - a.count).slice(0, 30),
        recentErrors: metrics.errors.getRecent(10),
        recentSlowQueries: metrics.slowQueries.getRecent(10),
        recentAlerts: metrics.alerts.getRecent(10),
        thresholds: metrics.thresholds,
    };
}

// ── Get Detailed Endpoint Stats ────────────────────────────────
function getEndpointStats() {
    return Array.from(metrics.endpoints.entries()).map(([key, val]) => {
        const durations = val.recentDurations.getAll().sort((a, b) => a - b);
        const percentile = (arr, p) => arr.length ? arr[Math.floor(arr.length * p / 100)] : 0;
        return {
            endpoint: key,
            count: val.count,
            errors: val.errors,
            errorRate: val.count > 0 ? ((val.errors / val.count) * 100).toFixed(1) + '%' : '0%',
            avgMs: Math.round(val.totalTime / val.count),
            p50: percentile(durations, 50),
            p95: percentile(durations, 95),
            p99: percentile(durations, 99),
            lastSeen: val.lastSeen,
        };
    }).sort((a, b) => b.count - a.count);
}

// ── Reset Counters ─────────────────────────────────────────────
function resetMetrics() {
    metrics.counters.totalRequests = 0;
    metrics.counters.totalErrors = 0;
    metrics.counters.totalSuccess = 0;
    metrics.counters.total4xx = 0;
    metrics.counters.total5xx = 0;
    metrics.counters.startTime = Date.now();
    metrics.endpoints.clear();
}

module.exports = {
    monitoringMiddleware,
    getMetrics,
    getEndpointStats,
    resetMetrics,
    emitAlert,
    metrics,
};
