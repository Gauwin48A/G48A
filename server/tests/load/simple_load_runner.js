#!/usr/bin/env node
/**
 * Simple load runner without external dependencies.
 * Produces comparable latency/error snapshots for normal and abuse scenarios.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const args = process.argv.slice(2);
const argMap = new Map();
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    argMap.set(key, value);
  }
}

const dryRun = argMap.get('dry-run') === 'true' || argMap.get('dry-run') === '1';
const baseUrl = argMap.get('base-url') || process.env.LOAD_TEST_BASE_URL || 'http://127.0.0.1:5000';
const outDir = argMap.get('out-dir') || path.join(__dirname, 'results');
const timeoutMs = Number.parseInt(argMap.get('timeout-ms') || process.env.LOAD_TEST_TIMEOUT_MS || '8000', 10);
const scenarioArg = (argMap.get('scenario') || process.env.LOAD_TEST_SCENARIO || 'both').toLowerCase();
const bootstrapRetries = Number.parseInt(argMap.get('bootstrap-retries') || process.env.LOAD_TEST_BOOTSTRAP_RETRIES || '3', 10);
const bootstrapRetryDelayMs = Number.parseInt(argMap.get('bootstrap-retry-delay-ms') || process.env.LOAD_TEST_BOOTSTRAP_RETRY_DELAY_MS || '250', 10);

const profiles = {
  normal: {
    '1k': { simulatedUsers: 1000, concurrentWorkers: 10, totalRequests: 200 },
    '10k': { simulatedUsers: 10000, concurrentWorkers: 30, totalRequests: 800 },
    '50k': { simulatedUsers: 50000, concurrentWorkers: 80, totalRequests: 2400 }
  },
  abuse: {
    '1k': { simulatedUsers: 1, concurrentWorkers: 10, totalRequests: 200 },
    '10k': { simulatedUsers: 1, concurrentWorkers: 30, totalRequests: 800 },
    '50k': { simulatedUsers: 1, concurrentWorkers: 80, totalRequests: 2400 }
  },
  authenticated: {
    '1k': { simulatedUsers: 500, concurrentWorkers: 8, totalRequests: 240 },
    '10k': { simulatedUsers: 5000, concurrentWorkers: 20, totalRequests: 800 },
    '50k': { simulatedUsers: 10000, concurrentWorkers: 40, totalRequests: 1800 }
  }
};

const readEndpoints = [
  { key: 'health', method: 'GET', path: '/health' },
  { key: 'posts', method: 'GET', path: '/api/posts' },
  { key: 'publicWall', method: 'GET', path: '/api/public-wall' }
];

const authenticatedEndpoints = [
  { key: 'authMe', method: 'GET', path: '/api/auth/me', requiresAuth: true },
  { key: 'authValidate', method: 'GET', path: '/api/auth/validate', requiresAuth: true },
  {
    key: 'batchViewWrite',
    method: 'POST',
    path: '/api/posts/batch-view',
    requiresAuth: false,
    bodyFactory: (requestNumber, scenario, profileName, context = {}) => ({
      postIds: Array.isArray(context.samplePostIds) ? context.samplePostIds.slice(0, 5) : [],
      metadata: `${scenario}/${profileName}/${requestNumber}`
    })
  }
];

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function buildScenarioHeaders(profileName, scenario, requestNumber, simulatedUsers) {
  const safeUsers = Math.max(1, simulatedUsers);
  const userIndex = scenario === 'abuse' ? 1 : ((requestNumber % safeUsers) + 1);
  return {
    'x-load-test-scenario': scenario,
    'x-simulated-user': `${profileName}:${scenario}:u${userIndex}`
  };
}

async function runSingleRequest(url, method, headers) {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutRef = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = { method, headers, signal: controller.signal };
    if (method !== 'GET' && method !== 'HEAD' && headers?.__body !== undefined) {
      options.body = headers.__body;
      delete headers.__body;
    }

    const response = await fetch(url, options);
    const latencyMs = performance.now() - start;
    return {
      ok: response.ok,
      status: response.status,
      latencyMs
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'request_failed',
      latencyMs: performance.now() - start
    };
  } finally {
    clearTimeout(timeoutRef);
  }
}

async function runEndpointLoad(profileName, profileConfig, endpoint, scenario, context = {}) {
  const target = `${baseUrl}${endpoint.path}`;
  const latencies = [];
  let success = 0;
  let failures = 0;
  const errors = {};

  let launched = 0;
  const worker = async () => {
    while (launched < profileConfig.totalRequests) {
      launched += 1;
      const headers = buildScenarioHeaders(
        profileName,
        scenario,
        launched,
        profileConfig.simulatedUsers
      );
      if (endpoint.requiresAuth && endpoint.authToken) {
        headers.authorization = `Bearer ${endpoint.authToken}`;
      }
      if (typeof endpoint.bodyFactory === 'function') {
        headers['content-type'] = 'application/json';
        headers.__body = JSON.stringify(endpoint.bodyFactory(launched, scenario, profileName, context));
      }
      const result = await runSingleRequest(target, endpoint.method, headers);
      latencies.push(result.latencyMs);
      if (result.ok) {
        success += 1;
      } else {
        failures += 1;
        const key = String(result.status || result.error || 'unknown');
        errors[key] = (errors[key] || 0) + 1;
      }
    }
  };

  const workers = Array.from({ length: profileConfig.concurrentWorkers }, () => worker());
  const startedAt = performance.now();
  await Promise.all(workers);
  const durationMs = performance.now() - startedAt;

  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    scenario,
    profile: profileName,
    endpoint: endpoint.path,
    method: endpoint.method,
    totals: {
      requests: latencies.length,
      success,
      failures
    },
    errorBreakdown: errors,
    latency: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted.length ? sorted[sorted.length - 1] : null
    },
    throughputRps: latencies.length > 0 && durationMs > 0 ? Number((latencies.length / (durationMs / 1000)).toFixed(2)) : 0
  };
}

async function parseResponseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, { retries = 3, retryDelayMs = 250 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && attempt < retries) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError || new Error(`fetch_with_retry_failed url=${url}`);
}

async function bootstrapAuthSession() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const signupPayload = {
    fullName: 'Load Test User',
    email: `load.${Date.now()}@example.com`,
    phone: `9${suffix}`,
    password: 'StrongPass123!A'
  };

  const signupRes = await fetchWithRetry(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(signupPayload)
  }, {
    retries: bootstrapRetries,
    retryDelayMs: bootstrapRetryDelayMs
  });
  const signupJson = await parseResponseJson(signupRes);

  if (!signupRes.ok || !signupJson?.token) {
    throw new Error(`Auth bootstrap failed: status=${signupRes.status} body=${JSON.stringify(signupJson)}`);
  }

  return {
    token: signupJson.token,
    userId: signupJson.user?.id || null
  };
}

async function bootstrapLoadContext() {
  const auth = await bootstrapAuthSession();
  const postsRes = await fetchWithRetry(`${baseUrl}/api/posts`, {}, {
    retries: bootstrapRetries,
    retryDelayMs: bootstrapRetryDelayMs
  });
  const postsJson = await parseResponseJson(postsRes);
  const rawPosts = Array.isArray(postsJson)
    ? postsJson
    : Array.isArray(postsJson?.posts)
      ? postsJson.posts
      : [];
  const samplePostIds = rawPosts
    .map((post) => post?.post_id || post?.id)
    .filter(Boolean)
    .slice(0, 20);

  return {
    auth,
    samplePostIds
  };
}

function resolveScenarios(value) {
  if (value === 'both') return ['normal', 'abuse'];
  if (value === 'full' || value === 'all') return ['normal', 'abuse', 'authenticated'];
  if (value === 'authenticated' || value === 'auth') return ['authenticated'];
  if (value === 'normal' || value === 'abuse') return [value];
  return [];
}

function endpointsForScenario(scenario) {
  if (scenario === 'authenticated') return authenticatedEndpoints;
  return readEndpoints;
}

function writeReport(report) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outDir, `capacity_report_${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return outputPath;
}

async function main() {
  const scenarios = resolveScenarios(scenarioArg);

  if (!scenarios.length) {
    throw new Error(`Invalid scenario "${scenarioArg}". Use normal, abuse, both, authenticated, or full.`);
  }

  if (dryRun) {
    const report = {
      mode: 'dry-run',
      generatedAt: new Date().toISOString(),
      baseUrl,
      timeoutMs,
      scenarios,
      profiles,
      endpoints: {
        read: readEndpoints,
        authenticated: authenticatedEndpoints
      }
    };
    const outputPath = writeReport(report);
    console.log(`[LOAD] Dry-run plan written: ${outputPath}`);
    return;
  }

  const summary = [];
  const loadContext = scenarios.includes('authenticated')
    ? await bootstrapLoadContext()
    : { auth: null, samplePostIds: [] };
  for (const scenario of scenarios) {
    const profileSet = profiles[scenario];
    const scenarioEndpoints = endpointsForScenario(scenario).map((endpoint) => ({
      ...endpoint,
      authToken: endpoint.requiresAuth ? loadContext.auth?.token : null
    }));
    for (const [profileName, profileConfig] of Object.entries(profileSet)) {
      for (const endpoint of scenarioEndpoints) {
        // eslint-disable-next-line no-await-in-loop
        const result = await runEndpointLoad(profileName, profileConfig, endpoint, scenario, loadContext);
        summary.push(result);
        console.log(
          `[LOAD] ${scenario} ${profileName} ${endpoint.path} -> p95=${result.latency.p95}ms errors=${result.totals.failures}`
        );
      }
    }
  }

  const report = {
    mode: 'live',
    generatedAt: new Date().toISOString(),
    baseUrl,
    timeoutMs,
    scenarios,
    results: summary
  };
  const outputPath = writeReport(report);
  console.log(`[LOAD] Capacity report written: ${outputPath}`);
}

main().catch((err) => {
  console.error('[LOAD] Failed:', err);
  process.exit(1);
});
