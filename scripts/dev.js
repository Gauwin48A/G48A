const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const defaultServerPort = process.env.MHUB_SERVER_PORT || '5001';
const defaultApiOrigin = process.env.VITE_API_BASE_URL || `http://localhost:${defaultServerPort}`;
const defaultSocketOrigin = process.env.VITE_SOCKET_URL || defaultApiOrigin;

function run(label, cwd, args, extraEnv = {}) {
  const child = spawn(npmCommand, args, {
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

const processes = [
  // Use `start` here intentionally: it auto-clears conflicting listeners on the selected backend port.
  // This prevents accidental attachment to a different local backend service.
  run('server', path.join(rootDir, 'server'), ['run', 'start'], {
    PORT: defaultServerPort
  }),
  run('client', path.join(rootDir, 'client'), ['run', 'dev'], {
    VITE_API_BASE_URL: defaultApiOrigin,
    VITE_SOCKET_URL: defaultSocketOrigin,
    VITE_DEV_PROXY_TARGET: defaultApiOrigin
  })
];

let shuttingDown = false;

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

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown) {
      const exitCode = typeof code === 'number' ? code : 1;
      shutdown(exitCode);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
