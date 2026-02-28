#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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
        const equalIndex = token.indexOf('=');
        if (equalIndex > 2) {
            const key = token.slice(2, equalIndex);
            const value = token.slice(equalIndex + 1) || 'true';
            args[key] = value;
            continue;
        }
        const key = token.slice(2);
        const hasInlineValue = argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--');
        const value = hasInlineValue ? argv[i + 1] : 'true';
        args[key] = value;
        if (hasInlineValue) i += 1;
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
        regionA: normalizeUrl(args['region-a-url'] || env.REGION_A_BASE_URL || 'http://127.0.0.1:5055'),
        regionB: normalizeUrl(args['region-b-url'] || env.REGION_B_BASE_URL || 'http://127.0.0.1:6055'),
        healthPath: args['health-path'] || env.ACTIVE_ACTIVE_HEALTH_PATH || '/api/ready',
        timeoutMs: parseIntSafe(args['timeout-ms'] || env.ACTIVE_ACTIVE_TIMEOUT_MS, 5000),
        trafficCommand: String(args['traffic-command'] || env.ACTIVE_ACTIVE_TRAFFIC_COMMAND || '').trim(),
        primaryDbUrl: String(args['primary-db-url'] || env.FAILOVER_PRIMARY_DB_URL || '').trim(),
        replicaDbUrl: String(args['replica-db-url'] || env.FAILOVER_REPLICA_DB_URL || '').trim(),
        skipProbe: parseBoolean(args['skip-probe'] || env.ACTIVE_ACTIVE_DEPENDENCY_SKIP_PROBE, false),
        forceDbQueueAudit: parseBoolean(args['force-db-queue-audit'] || env.ACTIVE_ACTIVE_DEPENDENCY_FORCE_DB_QUEUE_AUDIT, false),
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
    if (!fs.existsSync(config.dbQueueAuditScript)) {
        return {
            status: 'BLOCKED',
            reportPath: null,
            report: null,
            error: `db_queue_audit_script_not_found:${config.dbQueueAuditScript}`
        };
    }

    const scriptArgs = buildDbQueueAuditArgs(config);
    try {
        const stdout = execFileSync('node', scriptArgs, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 90000
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

function buildDbQueueAuditArgs(config) {
    const args = [config.dbQueueAuditScript];

    if (config.primaryDbUrl) {
        args.push('--primary-url', config.primaryDbUrl);
    }
    if (config.replicaDbUrl) {
        args.push('--replica-url', config.replicaDbUrl);
    }
    if (config.outputDir) {
        args.push('--output-dir', config.outputDir);
    }

    return args;
}

function evaluateDependencies({
    config,
    probeRegionA = null,
    probeRegionB = null,
    dbQueueAudit = null
} = {}) {
    const dependencies = [];
    const regionAProbeStatus = String(probeRegionA?.healthStatus || '').toLowerCase();
    const regionBProbeStatus = String(probeRegionB?.healthStatus || '').toLowerCase();
    const regionAProbeSkipped = regionAProbeStatus === 'skipped' || regionAProbeStatus === 'probe_skipped';
    const regionBProbeSkipped = regionBProbeStatus === 'skipped' || regionBProbeStatus === 'probe_skipped';

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
            status: config.regionA
                ? (probeRegionA?.ok && !regionAProbeSkipped ? 'COMPLETE' : 'BLOCKED')
                : 'BLOCKED',
            dependency: 'REGION_A_BASE_URL reachable readiness endpoint',
            impact: 'Cannot verify source region health before failover',
            fallback: 'Keep tabletop and synthetic probes active',
            details: {
                regionA: config.regionA || null,
                probeSkipped: regionAProbeSkipped,
                probe: probeRegionA || null
            }
        })
    );

    dependencies.push(
        createDependency({
            key: 'region_b_endpoint',
            owner: 'Platform Engineering',
            status: config.regionB
                ? (probeRegionB?.ok && !regionBProbeSkipped ? 'COMPLETE' : 'BLOCKED')
                : 'BLOCKED',
            dependency: 'REGION_B_BASE_URL reachable readiness endpoint',
            impact: 'Cannot verify destination region health before failover',
            fallback: 'Block live shift and keep simulation coverage',
            details: {
                regionB: config.regionB || null,
                probeSkipped: regionBProbeSkipped,
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

function buildArtifactPayload(config, report) {
    const gate = report?.gate || {};
    return {
        generatedAt: new Date().toISOString(),
        runId: config.runId,
        config: {
            regionA: config.regionA || null,
            regionB: config.regionB || null,
            healthPath: config.healthPath,
            timeoutMs: config.timeoutMs,
            skipProbe: config.skipProbe
        },
        status: gate.status || 'BLOCKED',
        eligible: Boolean(gate.eligible),
        blockedCount: Number.isFinite(gate.blockedCount) ? gate.blockedCount : 0,
        reasons: Array.isArray(gate.reasons) ? gate.reasons : [],
        dependencies: Array.isArray(gate.dependencies) ? gate.dependencies : [],
        report
    };
}

function writeArtifact(config, report) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(config.outputDir, `active_active_dependency_gate_${stamp}.json`);
    const payload = buildArtifactPayload(config, report);
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    return outputPath;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = buildConfig(args, process.env);

    let probeRegionA;
    let probeRegionB;
    if (config.skipProbe) {
        probeRegionA = { ok: false, healthStatus: 'probe_skipped' };
        probeRegionB = { ok: false, healthStatus: 'probe_skipped' };
    } else {
        [probeRegionA, probeRegionB] = await Promise.all([
            probeRegion(config.regionA, config.healthPath, config.timeoutMs),
            probeRegion(config.regionB, config.healthPath, config.timeoutMs)
        ]);
    }
    const shouldRunDbQueueAudit = Boolean(config.primaryDbUrl && config.replicaDbUrl) || config.forceDbQueueAudit;
    const dbQueueAudit = shouldRunDbQueueAudit
        ? runDbQueueAudit(config)
        : {
            status: 'BLOCKED',
            reportPath: null,
            report: {
                gate: {
                    status: 'BLOCKED',
                    reasons: ['missing_primary_or_replica_connection']
                }
            },
            skipped: true,
            reason: 'db_queue_audit_skipped_missing_replica_inputs'
        };
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
    buildDbQueueAuditArgs,
    evaluateDependencies,
    buildArtifactPayload
};
