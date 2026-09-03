/**
 * Monitoring API Routes
 * 
 * Endpoints:
 *   GET  /api/monitoring/dashboard    — Full monitoring dashboard data
 *   GET  /api/monitoring/endpoints    — Per-endpoint performance stats
 *   GET  /api/monitoring/errors       — Recent error log
 *   GET  /api/monitoring/slow         — Slow request log
 *   GET  /api/monitoring/alerts       — Alert history
 *   GET  /api/monitoring/db           — Database health check
 *   GET  /api/monitoring/db/history    — Database health history
 *   GET  /api/monitoring/summary      — Quick summary for external monitoring
 *   POST /api/monitoring/reset        — Reset counters (admin only)
 *   POST /api/monitoring/alerts/test  — Trigger a test alert (admin only)
 */

const express = require('express');
const router = express.Router();
const { getMetrics, getEndpointStats, resetMetrics, emitAlert } = require('../middleware/monitoring');
const { checkHealth, getHealthHistory, getLatestHealth, getQueryStats } = require('../services/dbHealthMonitor');
const { healthCheck: redisHealth } = require('../config/redisCache');

// ── Simple admin auth middleware ───────────────────────────────
function requireAdmin(req, res, next) {
    // In production, use proper auth middleware. For now, check a header.
    const adminToken = req.headers['x-admin-token'] || req.query.admin_token;
    if (process.env.NODE_ENV === 'production' && adminToken !== process.env.MONITORING_ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ── GET /api/monitoring/dashboard ──────────────────────────────
router.get('/dashboard', async (req, res) => {
    try {
        const apiMetrics = getMetrics();
        const dbHealth = getLatestHealth() || await checkHealth();
        const queryPerf = getQueryStats();

        let redisStatus = 'unknown';
        try {
            const redisH = await redisHealth();
            redisStatus = redisH.status || 'unknown';
        } catch { redisStatus = 'error'; }

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            api: apiMetrics,
            database: {
                status: dbHealth.status,
                latencyMs: dbHealth.checks?.connectivity?.latencyMs,
                connectionPool: dbHealth.checks?.connectionPool,
                activeQueries: dbHealth.checks?.activeQueries,
                databaseSize: dbHealth.checks?.databaseSize,
                queryPerformance: queryPerf,
            },
            redis: { status: redisStatus },
            process: {
                pid: process.pid,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Dashboard fetch failed', message: err.message });
    }
});

// ── GET /api/monitoring/endpoints ──────────────────────────────
router.get('/endpoints', (req, res) => {
    try {
        const endpoints = getEndpointStats();
        res.json({
            count: endpoints.length,
            endpoints,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/monitoring/errors ─────────────────────────────────
router.get('/errors', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const errors = getMetrics().recentErrors.slice(-limit);
        res.json({ count: errors.length, errors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/monitoring/slow ───────────────────────────────────
router.get('/slow', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const slow = getMetrics().recentSlowQueries.slice(-limit);
        res.json({ count: slow.length, slowQueries: slow });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/monitoring/alerts ─────────────────────────────────
router.get('/alerts', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const severity = req.query.severity; // 'warning', 'critical', 'info'
        let alerts = getMetrics().recentAlerts;
        if (severity) alerts = alerts.filter(a => a.severity === severity);
        res.json({ count: alerts.length, alerts: alerts.slice(-limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/monitoring/db ─────────────────────────────────────
router.get('/db', async (req, res) => {
    try {
        const health = await checkHealth();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (err) {
        res.status(500).json({ error: 'Database health check failed', message: err.message });
    }
});

// ── GET /api/monitoring/db/history ─────────────────────────────
router.get('/db/history', (req, res) => {
    try {
        const history = getHealthHistory();
        res.json({
            count: history.length,
            checks: history.slice(-20),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/monitoring/summary ────────────────────────────────
// Lightweight summary for external monitoring tools (UptimeRobot, Grafana, etc.)
router.get('/summary', async (req, res) => {
    try {
        const metrics = getMetrics();
        const dbHealth = getLatestHealth();
        const isHealthy = metrics.requests.errors5xx === 0 ||
            parseFloat(metrics.requests.errorRate) < 10;

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'ok' : 'degraded',
            uptime: metrics.uptime,
            requests: metrics.requests.total,
            errorRate: metrics.requests.errorRate,
            avgResponseMs: metrics.responseTime.avg,
            p95ResponseMs: metrics.responseTime.p95,
            dbStatus: dbHealth?.status || 'unknown',
            memoryMB: metrics.memory.heapUsedMB,
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ── POST /api/monitoring/reset ─────────────────────────────────
router.post('/reset', requireAdmin, (req, res) => {
    resetMetrics();
    res.json({ message: 'Metrics counters reset', timestamp: new Date().toISOString() });
});

// ── POST /api/monitoring/alerts/test ───────────────────────────
router.post('/alerts/test', requireAdmin, (req, res) => {
    const severity = req.body.severity || 'info';
    const alert = emitAlert(severity, 'test_alert',
        'This is a test alert from the monitoring system',
        { triggeredBy: 'manual', timestamp: new Date().toISOString() }
    );
    res.json({ message: 'Test alert emitted', alert });
});

module.exports = router;
