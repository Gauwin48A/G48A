#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseIntSafe(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
        args[key] = value;
        if (value !== 'true') i += 1;
    }
    return args;
}

function parseOutputValue(output, key) {
    const pattern = new RegExp(`^${key}=(.+)$`, 'm');
    const match = String(output || '').match(pattern);
    return match ? match[1].trim() : null;
}

function normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '');
}

function createDependency({ key, owner, status, dependency, impact, fallback, details = {} }) {
    return { key, owner, status, dependency, impact, fallback, details };
}

function buildConfig(args = {}, env = process.env) {
    return {
        runId: args['run-id'] || env.ACTIVE_ACTIVE_DEPENDENCY_RUN_ID || `aadg-${Date.now()}`,
        regionA: normalizeUrl(args['region-a-url'] || env.REGION_A_BASE_URL || ''),
        regionB: normalizeUrl(args['region-b-url'] || env.REGION_B_BASE_URL || ''),
        healthPath: args['health-path'] || env.ACTIVE_ACTIVE_HEALTH_PATH || '/api/ready',
        timeoutMs: parseIntSafe(args['timeout-ms'] || env.ACTIVE_ACTIVE_TIMEOUT_MS, 5000),
        trafficCommand: String(args['traffic-command'] || env.ACTIVE_ACTIVE_TRAFFIC_COMMAND || '').trim(),
        primaryDbUrl: String(args['primary-db-url'] || env.FAILOVER_PRIMARY_DB_URL || '').trim(),
        replicaDbUrl: String(args['replica-db-url'] || env.FAILOVER_REPLICA_DB_URL || '').trim(),
        skipProbe: parseBoolean(args['skip-probe'] || env.ACTIVE_ACTIVE_DEPENDENCY_SKIP_PROBE, false),
        outputDir: path.resolve(process.cwd(), args['output-dir'] || env.ACTIVE_ACTIVE_OUTPUT_DIR || 'docs/artifacts'),
        dbQueueAuditScript: path.resolve(
            process.cwd(),
            args['db-queue-audit-script'] || env.ACTIVE_ACTIVE_DB_QUEUE_AUDIT_SCRIPT || 'scripts/run_failover_db_queue_audit.js'
        )
    };
}

async function probeRegion(baseUrl, healthPath, timeoutMs) {
    if (!baseUrl) {
        return {
            ok: false,
            statusCode: null,
            healthStatus: 'missing_url',
            durationMs: 0
        };
    }

    const startedAt = Date.now();
    try {
        const response = await axios.get(`${baseUrl}${healthPath}`, {
            timeout: timeoutMs,
            validateStatus: () => true
        });
        const health = response.data && typeof response.data === 'object' ? response.data.status : null;
        const ok = response.status >= 200 && response.status < 300 && health !== 'not_ready';
        return {
            ok,
            statusCode: response.status,
            healthStatus: health || 'unknown',
            durationMs: Date.now() - startedAt
        };
    } catch (error) {
        return {
            ok: false,
            statusCode: null,
            healthStatus: 'probe_error',
            error: error.message,
            durationMs: Date.now() - startedAt
        };
    }
}

function runDbQueueAudit(config) {
    try {
        const stdout = execSync(`node "${config.dbQueueAuditScript}"`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 90000,
            shell: true
        });
        const reportPath = parseOutputValue(stdout, 'FAILOVER_DB_QUEUE_AUDIT');
        const status = parseOutputValue(stdout, 'FAILOVER_DB_QUEUE_STATUS');
        let report = null;
        if (reportPath && fs.existsSync(reportPath)) {
            report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }
        return {
            status: status || 'BLOCKED',
            reportPath: reportPath || null,
            report,
            rawOutput: stdout.trim()
        };
    } catch (error) {
        return {
            status: 'BLOCKED',
            reportPath: null,
            report: null,
            error: error.message
        };
    }
}

function evaluateDependencies({
    config,
    probeRegionA = null,
    probeRegionB = null,
    dbQueueAudit = null
} = {}) {
    const dependencies = [];

    dependencies.push(
        createDependency({
            key: 'traffic_manager_command',
            owner: 'Platform Engineering',
            status: config.trafficCommand ? 'COMPLETE' : 'BLOCKED',
            dependency: 'ACTIVE_ACTIVE_TRAFFIC_COMMAND with live provider credentials',
            impact: 'Cannot execute weighted traffic shift in live mode',
            fallback: 'Run synthetic execute proof with echo/template command until credential path is provisioned',
            details: {
                configured: Boolean(config.trafficCommand)
            }
        })
    );

    dependencies.push(
        createDependency({
            key: 'region_a_endpoint',
            owner: 'Platform Engineering',
            status: config.regionA ? (probeRegionA?.ok ? 'COMPLETE' : 'BLOCKED') : 'BLOCKED',
            dependency: 'REGION_A_BASE_URL reachable readiness endpoint',
            impact: 'Cannot verify source region health before failover',
            fallback: 'Keep tabletop and synthetic probes active',
            details: {
                regionA: config.regionA || null,
                probe: probeRegionA || null
            }
        })
    );

    dependencies.push(
        createDependency({
            key: 'region_b_endpoint',
            owner: 'Platform Engineering',
            status: config.regionB ? (probeRegionB?.ok ? 'COMPLETE' : 'BLOCKED') : 'BLOCKED',
            dependency: 'REGION_B_BASE_URL reachable readiness endpoint',
            impact: 'Cannot verify destination region health before failover',
            fallback: 'Block live shift and keep simulation coverage',
            details: {
                regionB: config.regionB || null,
                probe: probeRegionB || null
            }
        })
    );

    const dbUrlsConfigured = Boolean(config.primaryDbUrl && config.replicaDbUrl);
    dependencies.push(
        createDependency({
            key: 'replica_connection_inputs',
            owner: 'DB Engineering',
            status: dbUrlsConfigured ? 'COMPLETE' : 'BLOCKED',
            dependency: 'FAILOVER_PRIMARY_DB_URL + FAILOVER_REPLICA_DB_URL',
            impact: 'Cannot compute replica lag or failover eligibility from live replica state',
            fallback: 'Continue with queue duplicate audit and keep gate in BLOCKED state',
            details: {
                primaryConfigured: Boolean(config.primaryDbUrl),
                replicaConfigured: Boolean(config.replicaDbUrl)
            }
        })
    );

    const dbQueueStatus = String(dbQueueAudit?.status || '').toUpperCase();
    const dbQueueGateStatus = String(dbQueueAudit?.report?.gate?.status || '').toUpperCase();
    const dbQueueComplete = dbQueueStatus === 'COMPLETE' && dbQueueGateStatus === 'COMPLETE';

    dependencies.push(
        createDependency({
            key: 'db_queue_safety_gate',
            owner: 'DB Engineering + Backend Lead',
            status: dbQueueComplete ? 'COMPLETE' : 'BLOCKED',
            dependency: 'failover db/queue audit gate reports COMPLETE',
            impact: 'Execute mode must remain blocked by safety policy',
            fallback: 'Use synthetic execute mode with safety gate disabled only for rehearsal',
            details: {
                auditStatus: dbQueueAudit?.status || null,
                gateStatus: dbQueueAudit?.report?.gate?.status || null,
                reportPath: dbQueueAudit?.reportPath || null,
                reasons: dbQueueAudit?.report?.gate?.reasons || [],
                error: dbQueueAudit?.error || null
            }
        })
    );

    const blocked = dependencies.filter((item) => item.status === 'BLOCKED');
    return {
        status: blocked.length === 0 ? 'COMPLETE' : 'BLOCKED',
        eligible: blocked.length === 0,
        blockedCount: blocked.length,
        reasons: blocked.map((item) => item.key),
        dependencies
    };
}

function writeArtifact(config, report) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(config.outputDir, `active_active_dependency_gate_${stamp}.json`);
    const payload = {
        generatedAt: new Date().toISOString(),
        runId: config.runId,
        config: {
            regionA: config.regionA || null,
            regionB: config.regionB || null,
            healthPath: config.healthPath,
            timeoutMs: config.timeoutMs,
            skipProbe: config.skipProbe
        },
        report
    };
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    return outputPath;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = buildConfig(args, process.env);

    const probeRegionA = config.skipProbe
        ? { ok: true, healthStatus: 'skipped' }
        : await probeRegion(config.regionA, config.healthPath, config.timeoutMs);
    const probeRegionB = config.skipProbe
        ? { ok: true, healthStatus: 'skipped' }
        : await probeRegion(config.regionB, config.healthPath, config.timeoutMs);
    const dbQueueAudit = runDbQueueAudit(config);
    const gate = evaluateDependencies({
        config,
        probeRegionA,
        probeRegionB,
        dbQueueAudit
    });

    const report = {
        gate,
        probeRegionA,
        probeRegionB,
        dbQueueAudit
    };
    const outputPath = writeArtifact(config, report);
    console.log(`ACTIVE_ACTIVE_DEPENDENCY_REPORT=${outputPath}`);
    console.log(`ACTIVE_ACTIVE_DEPENDENCY_STATUS=${gate.status}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`ACTIVE_ACTIVE_DEPENDENCY_ERROR=${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    parseArgs,
    buildConfig,
    evaluateDependencies
};

