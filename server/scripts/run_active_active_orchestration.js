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

function parseOutputValue(output, key) {
    const pattern = new RegExp(`^${key}=(.+)$`, 'm');
    const match = String(output || '').match(pattern);
    return match ? match[1].trim() : null;
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

function parseShiftSteps(raw) {
    const source = String(raw || '').trim();
    if (!source) {
        return [
            { weightA: 90, weightB: 10 },
            { weightA: 75, weightB: 25 },
            { weightA: 50, weightB: 50 },
            { weightA: 25, weightB: 75 },
            { weightA: 0, weightB: 100 }
        ];
    }

    const steps = source.split(',').map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
        const pair = chunk.split(':').map((part) => Number.parseInt(part.trim(), 10));
        if (pair.length !== 2 || pair.some((num) => !Number.isFinite(num))) {
            throw new Error(`Invalid shift step format: "${chunk}"`);
        }
        if (pair[0] < 0 || pair[0] > 100 || pair[1] < 0 || pair[1] > 100) {
            throw new Error(`Shift step must be in 0..100 range: "${chunk}"`);
        }
        if (pair[0] + pair[1] !== 100) {
            throw new Error(`Shift step must sum to 100: "${chunk}"`);
        }
        return { weightA: pair[0], weightB: pair[1] };
    });

    if (steps.length === 0) {
        throw new Error('No valid shift steps were provided');
    }

    return steps;
}

function renderTrafficCommand(template, payload) {
    return String(template || '')
        .replace(/\{WEIGHT_A\}/g, String(payload.weightA))
        .replace(/\{WEIGHT_B\}/g, String(payload.weightB))
        .replace(/\{REGION_A\}/g, String(payload.regionA))
        .replace(/\{REGION_B\}/g, String(payload.regionB));
}

function normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '');
}

function buildConfig(args = {}, env = process.env) {
    const mode = String(args.mode || env.MULTI_REGION_EXEC_MODE || 'simulate').toLowerCase();
    const runSafetyAuditArg = args['run-safety-audit'] ?? env.ACTIVE_ACTIVE_RUN_SAFETY_AUDIT;
    const runSafetyAudit = runSafetyAuditArg === undefined
        ? mode === 'execute'
        : parseBoolean(runSafetyAuditArg, mode === 'execute');

    return {
        runId: args['run-id'] || env.ACTIVE_ACTIVE_RUN_ID || `aa-${Date.now()}`,
        regionA: normalizeUrl(args['region-a-url'] || env.REGION_A_BASE_URL || 'http://127.0.0.1:5055'),
        regionB: normalizeUrl(args['region-b-url'] || env.REGION_B_BASE_URL || 'http://127.0.0.1:6055'),
        healthPath: args['health-path'] || env.ACTIVE_ACTIVE_HEALTH_PATH || '/api/ready',
        timeoutMs: parseIntSafe(args['timeout-ms'] || env.ACTIVE_ACTIVE_TIMEOUT_MS, 5000),
        settleMs: parseIntSafe(args['settle-ms'] || env.ACTIVE_ACTIVE_SETTLE_MS, 250),
        mode,
        rollbackOnFailure: parseBoolean(args['rollback-on-failure'] || env.ACTIVE_ACTIVE_ROLLBACK_ON_FAILURE, true),
        syntheticProbe: parseBoolean(args['synthetic-probe'] || env.ACTIVE_ACTIVE_SYNTHETIC_PROBE, false),
        shiftSteps: parseShiftSteps(args['shift-steps'] || env.ACTIVE_ACTIVE_SHIFT_STEPS),
        trafficCommandTemplate: args['traffic-command'] || env.ACTIVE_ACTIVE_TRAFFIC_COMMAND || '',
        trafficCommandRequired: parseBoolean(args['require-traffic-command'] || env.ACTIVE_ACTIVE_REQUIRE_TRAFFIC_COMMAND, true),
        runSafetyAudit,
        safetyGateRequired: parseBoolean(args['require-safety-gate'] || env.ACTIVE_ACTIVE_REQUIRE_SAFETY_GATE, true),
        safetyAuditPath: args['safety-audit-path'] || env.ACTIVE_ACTIVE_SAFETY_AUDIT_PATH || '',
        safetyAuditScript: path.resolve(process.cwd(), args['safety-audit-script'] || env.ACTIVE_ACTIVE_SAFETY_AUDIT_SCRIPT || 'scripts/run_failover_db_queue_audit.js'),
        outputDir: path.resolve(process.cwd(), args['output-dir'] || env.ACTIVE_ACTIVE_OUTPUT_DIR || 'docs/artifacts')
    };
}

function loadJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
}

function resolveSafetyAudit(config) {
    if (config.safetyAuditPath) {
        const resolvedPath = path.isAbsolute(config.safetyAuditPath)
            ? config.safetyAuditPath
            : path.resolve(process.cwd(), config.safetyAuditPath);
        if (!fs.existsSync(resolvedPath)) {
            return {
                source: 'path',
                status: 'BLOCKED',
                path: resolvedPath,
                reason: 'safety_audit_path_not_found',
                report: null
            };
        }
        try {
            return {
                source: 'path',
                status: 'COMPLETE',
                path: resolvedPath,
                report: loadJson(resolvedPath)
            };
        } catch (error) {
            return {
                source: 'path',
                status: 'BLOCKED',
                path: resolvedPath,
                reason: `safety_audit_parse_failed:${error.message}`,
                report: null
            };
        }
    }

    if (!config.runSafetyAudit) {
        return {
            source: 'disabled',
            status: 'PENDING',
            reason: 'safety_audit_not_requested',
            report: null
        };
    }

    try {
        const stdout = execSync(`node "${config.safetyAuditScript}"`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 90000,
            shell: true
        });
        const reportPath = parseOutputValue(stdout, 'FAILOVER_DB_QUEUE_AUDIT');
        const status = parseOutputValue(stdout, 'FAILOVER_DB_QUEUE_STATUS');
        if (reportPath && fs.existsSync(reportPath)) {
            return {
                source: 'script',
                status: status || 'COMPLETE',
                path: reportPath,
                report: loadJson(reportPath),
                rawOutput: stdout.trim()
            };
        }

        return {
            source: 'script',
            status: status || 'BLOCKED',
            reason: 'safety_audit_report_missing',
            path: reportPath,
            report: null,
            rawOutput: stdout.trim()
        };
    } catch (error) {
        return {
            source: 'script',
            status: 'BLOCKED',
            reason: `safety_audit_execution_failed:${error.message}`,
            report: null
        };
    }
}

function evaluatePreflight(config, safetyAudit) {
    const issues = [];

    if (config.mode === 'execute' && config.trafficCommandRequired && !String(config.trafficCommandTemplate).trim()) {
        issues.push('missing_traffic_command_template');
    }

    if (config.mode === 'execute' && config.safetyGateRequired) {
        if (!safetyAudit || !safetyAudit.report || !safetyAudit.report.gate) {
            issues.push('missing_safety_gate_report');
        } else if (String(safetyAudit.report.gate.status || '').toUpperCase() !== 'COMPLETE') {
            issues.push(`safety_gate_${String(safetyAudit.report.gate.status || 'unknown').toLowerCase()}`);
        }
    }

    return {
        status: issues.length === 0 ? 'COMPLETE' : 'BLOCKED',
        eligible: issues.length === 0,
        issues
    };
}

async function probeRegion(baseUrl, healthPath, timeoutMs) {
    const startedAt = Date.now();
    try {
        const res = await axios.get(`${baseUrl}${healthPath}`, {
            timeout: timeoutMs,
            validateStatus: () => true
        });
        const health = res.data && typeof res.data === 'object' ? res.data.status : null;
        const durationMs = Date.now() - startedAt;
        const healthy = res.status >= 200 && res.status < 300 && health !== 'not_ready';
        return {
            ok: healthy,
            statusCode: res.status,
            healthStatus: health || 'unknown',
            durationMs
        };
    } catch (error) {
        return {
            ok: false,
            statusCode: null,
            healthStatus: 'probe_error',
            durationMs: Date.now() - startedAt,
            error: error.message
        };
    }
}

async function syntheticProbeRegion() {
    return {
        ok: true,
        statusCode: 200,
        healthStatus: 'ready',
        durationMs: 1
    };
}

function runTrafficShiftCommand(config, step) {
    const payload = {
        weightA: step.weightA,
        weightB: step.weightB,
        regionA: config.regionA,
        regionB: config.regionB
    };
    const rendered = renderTrafficCommand(config.trafficCommandTemplate, payload);
    if (config.mode !== 'execute') {
        return {
            mode: 'simulate',
            command: rendered || `SIMULATED_SHIFT regionA=${step.weightA} regionB=${step.weightB}`
        };
    }

    if (!rendered) {
        throw new Error('Missing ACTIVE_ACTIVE_TRAFFIC_COMMAND template for execute mode');
    }

    const startedAt = Date.now();
    const stdout = execSync(rendered, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 15000,
        shell: true
    });
    return {
        mode: 'execute',
        command: rendered,
        durationMs: Date.now() - startedAt,
        stdout: String(stdout || '').trim()
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStepRecord(index, weights, commandResult, probeA, probeB) {
    return {
        step: index + 1,
        timestamp: new Date().toISOString(),
        weights,
        command: commandResult,
        probes: {
            regionA: probeA,
            regionB: probeB
        },
        healthy: Boolean(probeA.ok && probeB.ok)
    };
}

async function runOrchestration(config, deps = {}) {
    const probeFn = deps.probeFn || probeRegion;
    const commandRunner = deps.commandRunner || ((step) => runTrafficShiftCommand(config, step));
    const sleepFn = deps.sleepFn || sleep;
    const startedAt = Date.now();

    const timeline = [];
    const failures = [];
    let previousWeights = { weightA: 100, weightB: 0 };
    let finalStatus = 'completed';

    const probeInvoker = config.syntheticProbe ? syntheticProbeRegion : probeFn;
    if (config.preflight) {
        timeline.push({
            phase: 'preflight',
            timestamp: new Date().toISOString(),
            mode: config.mode,
            preflight: config.preflight,
            safetyAudit: config.safetyAudit
                ? {
                    source: config.safetyAudit.source || null,
                    status: config.safetyAudit.status || null,
                    path: config.safetyAudit.path || null,
                    reason: config.safetyAudit.reason || null
                }
                : null
        });
        if (!config.preflight.eligible) {
            finalStatus = 'blocked_preflight';
            return {
                finalStatus,
                startedAt: new Date(startedAt).toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                timeline,
                failures: config.preflight.issues
            };
        }
    }

    const initialRegionA = await probeInvoker(config.regionA, config.healthPath, config.timeoutMs);
    const initialRegionB = await probeInvoker(config.regionB, config.healthPath, config.timeoutMs);
    timeline.push({
        phase: 'initial_probe',
        timestamp: new Date().toISOString(),
        probes: { regionA: initialRegionA, regionB: initialRegionB }
    });

    if (!initialRegionA.ok) {
        finalStatus = 'blocked_initial_unhealthy_region_a';
        failures.push('Region-A is unhealthy before orchestration start');
        return {
            finalStatus,
            startedAt: new Date(startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            timeline,
            failures
        };
    }

    if (!initialRegionB.ok) {
        finalStatus = 'blocked_initial_unhealthy_region_b';
        failures.push('Region-B is unhealthy before orchestration start');
        return {
            finalStatus,
            startedAt: new Date(startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            timeline,
            failures
        };
    }

    for (let i = 0; i < config.shiftSteps.length; i += 1) {
        const weights = config.shiftSteps[i];
        let commandResult;
        try {
            commandResult = await commandRunner(weights, i);
        } catch (error) {
            finalStatus = 'command_failure';
            failures.push(`Command execution failed at step ${i + 1}: ${error.message}`);
            break;
        }

        await sleepFn(config.settleMs);
        const probeA = await probeInvoker(config.regionA, config.healthPath, config.timeoutMs);
        const probeB = await probeInvoker(config.regionB, config.healthPath, config.timeoutMs);
        const stepRecord = buildStepRecord(i, weights, commandResult, probeA, probeB);
        timeline.push(stepRecord);

        if (!stepRecord.healthy) {
            failures.push(`Health check failed at step ${i + 1}`);
            finalStatus = 'rollback_triggered';
            if (config.rollbackOnFailure) {
                const rollbackResult = await commandRunner(previousWeights, -1);
                const rollbackProbeA = await probeInvoker(config.regionA, config.healthPath, config.timeoutMs);
                const rollbackProbeB = await probeInvoker(config.regionB, config.healthPath, config.timeoutMs);
                timeline.push({
                    phase: 'rollback',
                    timestamp: new Date().toISOString(),
                    weights: previousWeights,
                    command: rollbackResult,
                    probes: {
                        regionA: rollbackProbeA,
                        regionB: rollbackProbeB
                    },
                    healthy: Boolean(rollbackProbeA.ok && rollbackProbeB.ok)
                });
                finalStatus = rollbackProbeA.ok && rollbackProbeB.ok ? 'rolled_back' : 'rollback_failed';
            }
            break;
        }

        previousWeights = weights;
    }

    const finishedAt = Date.now();
    const fullCutoverStep = timeline.find((row) => row.weights && row.weights.weightB === 100 && row.healthy);
    return {
        finalStatus,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        timeline,
        failures,
        metrics: {
            rtoEstimateMs: fullCutoverStep ? (new Date(fullCutoverStep.timestamp).getTime() - startedAt) : null,
            rollbackEnabled: config.rollbackOnFailure
        }
    };
}

function writeArtifact(config, report) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(config.outputDir, `active_active_orchestration_${stamp}.json`);
    const payload = {
        generatedAt: new Date().toISOString(),
        runId: config.runId,
        config: {
            regionA: config.regionA,
            regionB: config.regionB,
            healthPath: config.healthPath,
            timeoutMs: config.timeoutMs,
            settleMs: config.settleMs,
            mode: config.mode,
            rollbackOnFailure: config.rollbackOnFailure,
            syntheticProbe: config.syntheticProbe,
            shiftSteps: config.shiftSteps
        },
        report
    };
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    return outputPath;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = buildConfig(args, process.env);
    const safetyAudit = resolveSafetyAudit(config);
    const preflight = evaluatePreflight(config, safetyAudit);
    const report = await runOrchestration({
        ...config,
        safetyAudit,
        preflight
    });
    const outputPath = writeArtifact(config, report);
    console.log(`ACTIVE_ACTIVE_REPORT=${outputPath}`);
    console.log(`ACTIVE_ACTIVE_STATUS=${report.finalStatus}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`ACTIVE_ACTIVE_ERROR=${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    parseArgs,
    parseShiftSteps,
    renderTrafficCommand,
    buildConfig,
    evaluatePreflight,
    resolveSafetyAudit,
    runOrchestration
};
