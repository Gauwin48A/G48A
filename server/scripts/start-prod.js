/**
 * Production startup wrapper.
 *
 * Safety goals:
 * - Never kill unrelated processes by default.
 * - Restart with a bounded policy to avoid infinite crash loops.
 * - Allow optional force-kill only for known app-owned listeners.
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const os = require('os');
const path = require('path');

const PORT = Number.parseInt(process.env.PORT || '5001', 10) || 5001;
const isProduction = process.env.NODE_ENV === 'production';

function parseBoolean(rawValue, fallback) {
    if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
    const normalized = String(rawValue).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

const FORCE_KILL_ENABLED = parseBoolean(
    process.env.START_PROD_FORCE_KILL,
    !isProduction
);
const MAX_RESTARTS = Number.parseInt(process.env.START_PROD_MAX_RESTARTS || '3', 10) || 3;
const BASE_RESTART_DELAY_MS = Number.parseInt(process.env.START_PROD_RESTART_DELAY_MS || '2000', 10) || 2000;
const APP_SIGNATURES = [
    path.normalize(path.join(process.cwd(), 'src', 'index.js')).toLowerCase(),
    path.normalize(path.join(process.cwd(), 'scripts', 'start-prod.js')).toLowerCase()
];

function checkPort(port) {
    return new Promise((resolve, reject) => {
        const probeServer = net.createServer();

        probeServer.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
                return;
            }
            reject(err);
        });

        probeServer.once('listening', () => {
            probeServer.close(() => resolve(false));
        });

        probeServer.listen(port);
    });
}

function execCommand(command) {
    return new Promise((resolve) => {
        exec(command, (err, stdout) => {
            if (err) {
                resolve('');
                return;
            }
            resolve(String(stdout || ''));
        });
    });
}

async function listPidsOnPort(port) {
    const isWin = os.platform() === 'win32';
    const command = isWin
        ? `netstat -ano -p tcp | findstr :${port}`
        : `lsof -i :${port} -t`;
    const output = await execCommand(command);
    if (!output.trim()) return [];

    const pids = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (!isWin) return line;
            const parts = line.split(/\s+/);
            return parts[parts.length - 1];
        })
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0);

    return [...new Set(pids)];
}

async function readCommandLine(pid) {
    const isWin = os.platform() === 'win32';
    const command = isWin
        ? `wmic process where processid=${pid} get CommandLine /value`
        : `ps -p ${pid} -o command=`;
    const output = await execCommand(command);
    if (isWin) {
        const line = output
            .split(/\r?\n/)
            .find((candidate) => candidate.startsWith('CommandLine='));
        return line ? line.replace(/^CommandLine=/, '').trim() : '';
    }
    return output.trim();
}

function isAppOwnedCommand(commandLine) {
    const normalized = path.normalize(String(commandLine || '')).toLowerCase();
    return APP_SIGNATURES.some((signature) => normalized.includes(signature));
}

async function killPid(pid) {
    const isWin = os.platform() === 'win32';
    const command = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
    await execCommand(command);
}

async function clearPortIfSafe(port) {
    const pids = await listPidsOnPort(port);
    if (pids.length === 0) return;

    if (!FORCE_KILL_ENABLED) {
        throw new Error(
            `Port ${port} is busy (pid(s): ${pids.join(', ')}). ` +
            'Refusing to kill listeners; set START_PROD_FORCE_KILL=true to allow safe app-owned cleanup.'
        );
    }

    const owned = [];
    const foreign = [];

    for (const pid of pids) {
        // eslint-disable-next-line no-await-in-loop
        const commandLine = await readCommandLine(pid);
        if (isAppOwnedCommand(commandLine)) {
            owned.push({ pid, commandLine });
        } else {
            foreign.push({ pid, commandLine });
        }
    }

    if (foreign.length > 0) {
        const pidList = foreign.map((entry) => entry.pid).join(', ');
        throw new Error(
            `Port ${port} is occupied by non-MHub process(es): ${pidList}. ` +
            'Stop those processes manually before retrying.'
        );
    }

    if (owned.length === 0) {
        throw new Error(`Port ${port} is busy but no app-owned process was detected for safe cleanup.`);
    }

    console.warn(`[start-prod] Port ${port} busy; stopping app-owned pid(s): ${owned.map((entry) => entry.pid).join(', ')}`);
    for (const entry of owned) {
        // eslint-disable-next-line no-await-in-loop
        await killPid(entry.pid);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
}

function spawnServer(restartCount = 0) {
    const child = spawn(process.execPath, ['src/index.js'], {
        stdio: 'inherit',
        env: {
            ...process.env,
            PORT: String(PORT)
        },
        cwd: process.cwd()
    });

    child.on('close', (code) => {
        if (code === 0) {
            process.exit(0);
            return;
        }

        const nextRestartCount = restartCount + 1;
        if (nextRestartCount > MAX_RESTARTS) {
            console.error(
                `[start-prod] Server exited with code ${code}. Restart limit reached ` +
                `(${MAX_RESTARTS}). Exiting.`
            );
            process.exit(code || 1);
            return;
        }

        const delay = BASE_RESTART_DELAY_MS * nextRestartCount;
        console.error(
            `[start-prod] Server exited with code ${code}. ` +
            `Restarting in ${delay}ms (${nextRestartCount}/${MAX_RESTARTS})...`
        );
        setTimeout(() => spawnServer(nextRestartCount), delay);
    });

    child.on('error', (error) => {
        console.error(`[start-prod] Failed to spawn server: ${error.message}`);
        process.exit(1);
    });
}

async function main() {
    console.log('[start-prod] Starting server bootstrap...');
    const isBusy = await checkPort(PORT);
    if (isBusy) {
        await clearPortIfSafe(PORT);
    }

    const stillBusy = await checkPort(PORT);
    if (stillBusy) {
        throw new Error(`Port ${PORT} is still busy after cleanup attempt.`);
    }

    console.log(`[start-prod] Port ${PORT} is clear. Launching server.`);
    spawnServer(0);
}

main().catch((error) => {
    console.error(`[start-prod] Startup failed: ${error.message}`);
    process.exit(1);
});
