#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SERVER_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.join(SERVER_ROOT, 'docs', 'artifacts');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        const body = await response.json();
        return {
            ok: response.ok,
            statusCode: response.status,
            body
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function waitUntilHealthy(baseUrl, child, timeoutMs = 180000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (child.exitCode !== null) {
            throw new Error(`Server exited early with code ${child.exitCode}`);
        }
        try {
            const health = await fetchJson(`${baseUrl}/health`, 4000);
            if (health.statusCode === 200) {
                return;
            }
        } catch {
            // Retry until timeout.
        }
        await sleep(1000);
    }
    throw new Error(`Server did not become healthy at ${baseUrl} within ${timeoutMs}ms`);
}

async function stopServer(child) {
    if (!child || child.killed) return;
    child.kill('SIGINT');

    const exited = await Promise.race([
        new Promise((resolve) => child.once('exit', () => resolve(true))),
        sleep(5000).then(() => false)
    ]);

    if (!exited && child.pid) {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    }
}

function buildSnapshotFixtures() {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const freshPath = path.join(ARTIFACT_DIR, 'directory_snapshot_fresh.json');
    const stalePath = path.join(ARTIFACT_DIR, 'directory_snapshot_stale.json');
    fs.writeFileSync(freshPath, JSON.stringify({ generatedAt: new Date().toISOString(), records: 1234 }, null, 2));
    fs.writeFileSync(stalePath, JSON.stringify({ generatedAt: '2025-01-01T00:00:00.000Z', records: 1234 }, null, 2));

    const staleTime = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000));
    fs.utimesSync(stalePath, staleTime, staleTime);
    return { freshPath, stalePath };
}

async function runScenario({ name, port, envOverrides }) {
    const baseUrl = `http://127.0.0.1:${port}`;
    const env = {
        ...process.env,
        PORT: String(port),
        NODE_ENV: process.env.NODE_ENV || 'development',
        ...envOverrides
    };

    const child = spawn('node', ['src/index.js'], {
        cwd: SERVER_ROOT,
        env,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdoutLines = [];
    const stderrLines = [];
    child.stdout?.on('data', (chunk) => {
        const line = String(chunk).trim();
        if (line) stdoutLines.push(line);
    });
    child.stderr?.on('data', (chunk) => {
        const line = String(chunk).trim();
        if (line) stderrLines.push(line);
    });

    try {
        await waitUntilHealthy(baseUrl, child);
        const readiness = await fetchJson(`${baseUrl}/api/ready`, 10000);
        return {
            scenario: name,
            baseUrl,
            statusCode: readiness.statusCode,
            readinessStatus: readiness.body?.status || 'unknown',
            checks: readiness.body?.checks || {},
            startupLogs: {
                stdout: stdoutLines.slice(-20),
                stderr: stderrLines.slice(-20)
            }
        };
    } catch (err) {
        return {
            scenario: name,
            baseUrl,
            error: err.message,
            startupLogs: {
                stdout: stdoutLines.slice(-40),
                stderr: stderrLines.slice(-40)
            }
        };
    } finally {
        await stopServer(child);
    }
}

function writeReport(report) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(ARTIFACT_DIR, `readiness_probe_matrix_${stamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
}

async function main() {
    const fixtures = buildSnapshotFixtures();
    const scenarios = [
        {
            name: 'ready',
            port: 5071,
            envOverrides: {
                READINESS_ALLOW_MEMORY_SESSION_FALLBACK: 'true',
                DIRECTORY_SNAPSHOT_PATH: fixtures.freshPath,
                DIRECTORY_SNAPSHOT_MAX_AGE_HOURS: '72'
            }
        },
        {
            name: 'degraded_snapshot_stale',
            port: 5062,
            envOverrides: {
                READINESS_ALLOW_MEMORY_SESSION_FALLBACK: 'true',
                DIRECTORY_SNAPSHOT_PATH: fixtures.stalePath,
                DIRECTORY_SNAPSHOT_MAX_AGE_HOURS: '1'
            }
        },
        {
            name: 'not_ready_missing_config',
            port: 5063,
            envOverrides: {
                READINESS_ALLOW_MEMORY_SESSION_FALLBACK: 'true',
                DIRECTORY_SNAPSHOT_PATH: fixtures.freshPath,
                DIRECTORY_SNAPSHOT_MAX_AGE_HOURS: '72',
                JWT_SECRET: ''
            }
        }
    ];

    const results = [];
    for (const scenario of scenarios) {
        // eslint-disable-next-line no-await-in-loop
        const result = await runScenario(scenario);
        results.push(result);
        console.log(`[READINESS] ${result.scenario} -> status=${result.readinessStatus} code=${result.statusCode}`);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        scenarios: results
    };
    const outputPath = writeReport(report);
    console.log(`READINESS_MATRIX_REPORT=${outputPath}`);
}

main().catch((err) => {
    console.error('[READINESS] Probe failed:', err);
    process.exit(1);
});
