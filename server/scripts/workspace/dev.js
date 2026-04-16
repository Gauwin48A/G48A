const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const rootDir = path.resolve(__dirname, "../../..");
const preferredServerPort = Number.parseInt(process.env.MHUB_SERVER_PORT || '5001', 10);
const preferredClientPort = Number.parseInt(process.env.MHUB_CLIENT_PORT || '8081', 10);

function isPositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isPortBusy(port) {
  const hostsToProbe = ['127.0.0.1', '::1'];

  const probeHost = (host) =>
    new Promise((resolve) => {
      const socket = net.createConnection({ port, host });
      let settled = false;

      const finalize = (busy) => {
        if (settled) return;
        settled = true;
        socket.removeAllListeners();
        socket.destroy();
        resolve(busy);
      };

      socket.setTimeout(500);
      socket.once('connect', () => finalize(true));
      socket.once('timeout', () => finalize(false));
      socket.once('error', (error) => {
        const code = error && error.code;
        if (
          code === 'ECONNREFUSED' ||
          code === 'EHOSTUNREACH' ||
          code === 'ENETUNREACH' ||
          code === 'EAFNOSUPPORT'
        ) {
          finalize(false);
          return;
        }
        finalize(true);
      });
    });

  return (async () => {
    for (const host of hostsToProbe) {
      // eslint-disable-next-line no-await-in-loop
      const busy = await probeHost(host);
      if (busy) {
        return true;
      }
    }
    return false;
  })();
}

async function findOpenPort(startPort, maxAttempts = 25) {
  const safeStart = isPositiveInteger(startPort, 1);
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = safeStart + offset;
    // eslint-disable-next-line no-await-in-loop
    const busy = await isPortBusy(port);
    if (!busy) {
      return port;
    }
  }
  throw new Error(`No open port found from ${safeStart} to ${safeStart + maxAttempts - 1}`);
}

function resolveNpmCommand(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      commandArgs: ['/d', '/s', '/c', 'npm', ...args]
    };
  }

  return {
    command: 'npm',
    commandArgs: args
  };
}

function run(label, cwd, args, extraEnv = {}) {
  const { command, commandArgs } = resolveNpmCommand(args);
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start:`, error.message);
  });

  return child;
}

let shuttingDown = false;
let processes = [];

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (child && !child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

function attachExitHandlers(children) {
  for (const child of children) {
    child.on('exit', (code) => {
      if (!shuttingDown) {
        const exitCode = typeof code === 'number' ? code : 1;
        shutdown(exitCode);
      }
    });
  }
}

async function main() {
  const resolvedServerPort = await findOpenPort(isPositiveInteger(preferredServerPort, 5001));
  const resolvedClientPort = await findOpenPort(isPositiveInteger(preferredClientPort, 8081));

  if (resolvedServerPort !== preferredServerPort) {
    console.warn(
      `[dev] Port ${preferredServerPort} is busy; using backend port ${resolvedServerPort} instead.`
    );
  }
  if (resolvedClientPort !== preferredClientPort) {
    console.warn(
      `[dev] Port ${preferredClientPort} is busy; using frontend port ${resolvedClientPort} instead.`
    );
  }

  const defaultApiOrigin = process.env.VITE_API_BASE_URL || `http://localhost:${resolvedServerPort}`;
  const defaultSocketOrigin = process.env.VITE_SOCKET_URL || defaultApiOrigin;

  processes = [
    // Use `start` here intentionally: it auto-clears conflicting listeners on the selected backend port.
    // This prevents accidental attachment to a different local backend service.
    run('server', path.join(rootDir, 'server'), ['run', 'start'], {
      PORT: String(resolvedServerPort)
    }),
    run('client', path.join(rootDir, 'client'), ['run', 'dev', '--', '--port', String(resolvedClientPort)], {
      VITE_API_BASE_URL: defaultApiOrigin,
      VITE_SOCKET_URL: defaultSocketOrigin,
      VITE_DEV_PROXY_TARGET: defaultApiOrigin
    })
  ];

  attachExitHandlers(processes);
}

main().catch((error) => {
  console.error(`[dev] Failed to bootstrap dev environment: ${error.message}`);
  shutdown(1);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));


