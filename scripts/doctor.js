const fs = require('fs');
const net = require('net');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function ok(message) {
  console.log(`OK   ${message}`);
}

function warn(message) {
  console.log(`WARN ${message}`);
}

function fail(message) {
  console.log(`FAIL ${message}`);
}

function isTrackedByGit(relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
      cwd: rootDir,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, '').trim();
    values[key] = value;
  }
  return values;
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function probeHttp(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const bodyText = await response.text();
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      bodyText,
      json
    };
  } catch (error) {
    return { error };
  }
}

async function run() {
  let failures = 0;

  const serverEnvPath = path.join(rootDir, 'server', '.env');
  const clientEnvPath = path.join(rootDir, 'client', '.env');
  const serverEnv = readEnvFile(serverEnvPath);

  if (fs.existsSync(serverEnvPath)) ok('server/.env found');
  else {
    fail('server/.env missing');
    failures += 1;
  }

  if (fs.existsSync(clientEnvPath)) ok('client/.env found');
  else warn('client/.env missing (optional; defaults will be used)');

  if (isTrackedByGit('server/.env')) {
    fail('server/.env is tracked by git. Run: git rm --cached server/.env (after rotating secrets).');
    failures += 1;
  } else {
    ok('server/.env is not tracked by git');
  }

  if (isTrackedByGit('client/.env')) {
    fail('client/.env is tracked by git. Run: git rm --cached client/.env.');
    failures += 1;
  } else {
    ok('client/.env is not tracked by git');
  }

  const requiredServerKeys = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'REFRESH_SECRET'
  ];

  for (const key of requiredServerKeys) {
    if (serverEnv[key]) ok(`server/.env has ${key}`);
    else {
      fail(`server/.env missing ${key}`);
      failures += 1;
    }
  }

  const majorNodeVersion = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (majorNodeVersion >= 20) ok(`Node.js ${process.versions.node} is supported`);
  else {
    fail(`Node.js ${process.versions.node} is below required major version 20`);
    failures += 1;
  }

  let serverPort = 5000;
  if (serverEnv.PORT) {
    const parsedPort = Number.parseInt(serverEnv.PORT, 10);
    if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      serverPort = parsedPort;
      ok(`Using server port ${serverPort} from server/.env`);
    } else {
      fail(`server/.env has invalid PORT value: "${serverEnv.PORT}"`);
      failures += 1;
    }
  }

  const serverRunning = await checkPortInUse(serverPort);
  const clientRunning = await checkPortInUse(8081) || await checkPortInUse(5173);

  if (serverRunning) warn(`Port ${serverPort} is already in use (server may already be running)`);
  else ok(`Port ${serverPort} is available`);

  if (clientRunning) warn('Frontend port 8081/5173 is already in use (client may already be running)');
  else ok('Frontend dev ports 8081/5173 are available');

  if (serverRunning) {
    const serverBaseUrl = `http://127.0.0.1:${serverPort}`;
    const healthProbe = await probeHttp(`${serverBaseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:8081' }
    });

    if (healthProbe.error) {
      fail(`Unable to probe ${serverBaseUrl}/api/health: ${healthProbe.error.message}`);
      failures += 1;
    } else {
      const corsHeader = healthProbe.headers.get('access-control-allow-origin');
      if (corsHeader) ok(`Port ${serverPort} CORS header present for Origin http://localhost:8081 (${corsHeader})`);
      else warn(`Port ${serverPort} health response is missing Access-Control-Allow-Origin for http://localhost:8081`);

      const reportedService = String(healthProbe.json?.service || '').toLowerCase();
      const looksLikeForeignService = reportedService && !reportedService.includes('mhub');
      const looksLikeMhubHealth = healthProbe.json && Object.prototype.hasOwnProperty.call(healthProbe.json, 'db');

      if (looksLikeForeignService) {
        fail(`Port ${serverPort} appears to be a different backend service (${healthProbe.json.service}).`);
        failures += 1;
      } else if (looksLikeMhubHealth) {
        ok(`Port ${serverPort} appears to be MHub backend (/api/health shape matched).`);
      } else {
        warn(`Port ${serverPort} identity unclear. /api/health body: ${healthProbe.bodyText.slice(0, 180)}`);
      }
    }

    const socketProbe = await probeHttp(`${serverBaseUrl}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: 'http://localhost:8081' }
    });
    if (socketProbe.error) {
      warn(`Socket.IO probe failed: ${socketProbe.error.message}`);
    } else {
      const socketCors = socketProbe.headers.get('access-control-allow-origin');
      if (socketCors) ok(`Socket.IO CORS header present (${socketCors})`);
      else warn('Socket.IO polling response missing Access-Control-Allow-Origin for http://localhost:8081');
    }
  }

  const message = failures === 0
    ? 'Doctor check passed.'
    : `Doctor check failed with ${failures} issue(s).`;

  console.log(message);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((error) => {
  console.error('Doctor script crashed:', error.message);
  process.exitCode = 1;
});
