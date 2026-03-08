const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

const checks = [
  {
    id: 'server-index-route-mounts',
    file: 'src/index.js',
    patterns: [
      /app\.use\(['"]\/api\/auth['"],\s*authRoutes\);/,
      /app\.use\(['"]\/api\/categories['"],\s*categoriesRoutes\);/,
      /app\.use\(['"]\/api\/posts['"],(?:[^;]*?)postsRoutes\);/,
      /app\.use\(['"]\/api\/location['"],\s*locationRoutes\);/,
      /app\.use\(['"]\/api\/channel['"],(?:[^;]*?)channelsRoutes\);/,
      /app\.use\(['"]\/api\/channels['"],(?:[^;]*?)channelsRoutes\);/,
      /app\.use\(['"]\/api\/users['"],\s*usersRoutes\);/,
      /app\.use\(['"]\/api\/publicwall['"],\s*publicWallRoutes\);/,
      /app\.use\(['"]\/api\/public-wall['"],\s*publicWallRoutes\);/
    ]
  },
  {
    id: 'server-index-socket-cors-contract',
    file: 'src/index.js',
    patterns: [
      /const io = new Server\(server,\s*\{/,
      /origin:\s*resolveCorsOrigin/,
      /app\.use\(cors\(corsOptions\)\);/,
      /app\.options\(\/\.\*\/,\s*cors\(corsOptions\)\);/,
      /localhostOriginPattern/
    ]
  },
  {
    id: 'server-index-epic1-foundation-contract',
    file: 'src/index.js',
    patterns: [
      /require\(["']\.\/middleware\/apiContract["']\)/,
      /require\(["']\.\/middleware\/runtimeBudget["']\)/,
      /require\(["']\.\/middleware\/tenantContext["']\)/,
      /app\.use\(["']\/api["'],\s*runtimeBudgetGuard\);/,
      /app\.use\(["']\/api["'],\s*apiContractGuard\);/,
      /app\.use\(["']\/api["'],\s*tenantContextGuard\);/,
      /requireCriticalTenantWriteContext/,
      /TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES/,
      /evaluateFoundationConfig/
    ]
  },
  {
    id: 'server-index-epic2-3-route-contract',
    file: 'src/index.js',
    patterns: [
      /require\(["']\.\/routes\/deviceLifecycle\.js["']\)/,
      /require\(["']\.\/routes\/telemetry\.js["']\)/,
      /\/api\/device-lifecycle/,
      /\/api\/telemetry/
    ]
  },
  {
    id: 'server-index-epic4-5-route-contract',
    file: 'src/index.js',
    patterns: [
      /require\(["']\.\/routes\/automation\.js["']\)/,
      /require\(["']\.\/routes\/fleetOrchestration\.js["']\)/,
      /\/api\/automation/,
      /\/api\/fleet-orchestration/
    ]
  },
  {
    id: 'server-index-epic6-10-route-contract',
    file: 'src/index.js',
    patterns: [
      /require\(["']\.\/routes\/securityOperations\.js["']\)/,
      /require\(["']\.\/routes\/reliability\.js["']\)/,
      /require\(["']\.\/routes\/operatorPlatform\.js["']\)/,
      /require\(["']\.\/routes\/intelligenceFinops\.js["']\)/,
      /require\(["']\.\/routes\/launchGovernance\.js["']\)/,
      /\/api\/security-operations/,
      /\/api\/reliability/,
      /\/api\/operator-platform/,
      /\/api\/intelligence-finops/,
      /\/api\/launch-governance/
    ]
  },
  {
    id: 'server-health-fingerprint-contract',
    file: 'src/index.js',
    patterns: [
      /app\.get\(['"]\/health['"]/,
      /app\.get\(['"]\/api\/health['"]/,
      /service:\s*['"]mhub-backend['"]/
    ]
  },
  {
    id: 'auth-refresh-route-contract',
    file: 'src/routes/auth.js',
    patterns: [
      /router\.post\(['"]\/refresh-token['"]/
    ]
  },
  {
    id: 'categories-route-contract',
    file: 'src/routes/categories.js',
    patterns: [
      /router\.get\(['"]\/['"]/
    ]
  },
  {
    id: 'for-you-route-contract',
    file: 'src/routes/posts.js',
    patterns: [
      /router\.get\(['"]\/for-you['"]/
    ]
  },
  {
    id: 'location-route-contract',
    file: 'src/routes/locationRoutes.js',
    patterns: [
      /router\.post\(['"]\/['"]/
    ]
  },
  {
    id: 'channels-route-contract',
    file: 'src/routes/channels.js',
    patterns: [
      /router\.post\(['"]\/create['"]/,
      /router\.get\(['"]\/owner\/:userId['"]/,
      /router\.put\(['"]\/:id['"]/,
      /router\.get\(['"]\/:id['"]/,
      /router\.post\(['"]\/:id\/posts['"]/
    ]
  },
  {
    id: 'users-kyc-route-contract',
    file: 'src/routes/users.js',
    patterns: [
      /router\.post\(['"]\/kyc\/submit['"]/,
      /router\.get\(['"]\/kyc\/status['"]/
    ]
  },
  {
    id: 'device-lifecycle-route-contract',
    file: 'src/routes/deviceLifecycle.js',
    patterns: [
      /router\.post\(['"]\/claim['"]/,
      /router\.post\(['"]\/revoke['"]/,
      /router\.post\(['"]\/rotate-credentials['"]/,
      /router\.post\(['"]\/revoke-credentials['"]/,
      /router\.post\(['"]\/reconcile['"]/,
      /router\.get\(['"]\/status\/:deviceId['"]/,
      /router\.get\(['"]\/credentials\/:deviceId['"]/
    ]
  },
  {
    id: 'telemetry-route-contract',
    file: 'src/routes/telemetry.js',
    patterns: [
      /router\.post\(['"]\/ingest['"]/,
      /router\.post\(['"]\/replay['"]/,
      /router\.get\(['"]\/metrics['"]/,
      /router\.get\(['"]\/schemas['"]/,
      /router\.post\(['"]\/schemas\/register['"]/,
      /router\.post\(['"]\/schemas\/activate['"]/,
      /router\.post\(['"]\/schemas\/deprecate['"]/
    ]
  },
  {
    id: 'automation-route-contract',
    file: 'src/routes/automation.js',
    patterns: [
      /router\.post\(['"]\/rules\/register['"]/,
      /router\.post\(['"]\/rules\/activate['"]/,
      /router\.post\(['"]\/rules\/simulate['"]/,
      /router\.post\(['"]\/events\/evaluate['"]/,
      /router\.get\(['"]\/twins\/:deviceId['"]/,
      /router\.get\(['"]\/alerts['"]/,
      /router\.post\(['"]\/alerts\/:alertId\/ack['"]/
    ]
  },
  {
    id: 'fleet-orchestration-route-contract',
    file: 'src/routes/fleetOrchestration.js',
    patterns: [
      /router\.post\(['"]\/commands\/send['"]/,
      /router\.post\(['"]\/commands\/:commandId\/approve['"]/,
      /router\.post\(['"]\/commands\/:commandId\/ack['"]/,
      /router\.post\(['"]\/ota\/artifacts\/register['"]/,
      /router\.post\(['"]\/ota\/rollouts\/create['"]/,
      /router\.post\(['"]\/ota\/rollouts\/:rolloutId\/advance['"]/,
      /router\.post\(['"]\/diagnostics\/run['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  },
  {
    id: 'security-operations-route-contract',
    file: 'src/routes/securityOperations.js',
    patterns: [
      /router\.post\(['"]\/access\/evaluate['"]/,
      /router\.post\(['"]\/abuse\/signals['"]/,
      /router\.post\(['"]\/supply-chain\/attest['"]/,
      /router\.post\(['"]\/privacy\/retention\/policies['"]/,
      /router\.post\(['"]\/privacy\/deletion\/sweep['"]/,
      /router\.post\(['"]\/incidents\/open['"]/,
      /router\.post\(['"]\/incidents\/:incidentId\/ack['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  },
  {
    id: 'reliability-route-contract',
    file: 'src/routes/reliability.js',
    patterns: [
      /router\.post\(['"]\/slos\/register['"]/,
      /router\.post\(['"]\/slos\/availability-sample['"]/,
      /router\.post\(['"]\/observability\/traces['"]/,
      /router\.post\(['"]\/chaos\/run['"]/,
      /router\.post\(['"]\/drills\/backup-restore['"]/,
      /router\.post\(['"]\/incidents\/open['"]/,
      /router\.post\(['"]\/incidents\/:incidentId\/postmortem['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  },
  {
    id: 'operator-platform-route-contract',
    file: 'src/routes/operatorPlatform.js',
    patterns: [
      /router\.post\(['"]\/console\/task-flows['"]/,
      /router\.post\(['"]\/console\/widgets['"]/,
      /router\.post\(['"]\/playbooks\/upsert['"]/,
      /router\.post\(['"]\/playbooks\/:playbookId\/run['"]/,
      /router\.post\(['"]\/developer\/apps\/register['"]/,
      /router\.post\(['"]\/ux\/accessibility\/audits['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  },
  {
    id: 'intelligence-finops-route-contract',
    file: 'src/routes/intelligenceFinops.js',
    patterns: [
      /router\.post\(['"]\/health\/ingest['"]/,
      /router\.post\(['"]\/maintenance\/recommend['"]/,
      /router\.post\(['"]\/energy\/optimize['"]/,
      /router\.post\(['"]\/finops\/usage\/record['"]/,
      /router\.post\(['"]\/experiments\/evaluate['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  },
  {
    id: 'launch-governance-route-contract',
    file: 'src/routes/launchGovernance.js',
    patterns: [
      /router\.post\(['"]\/onboarding\/start['"]/,
      /router\.post\(['"]\/onboarding\/:tenantId\/steps['"]/,
      /router\.post\(['"]\/billing\/usage\/record['"]/,
      /router\.post\(['"]\/compliance\/evidence\/register['"]/,
      /router\.post\(['"]\/certification\/run['"]/,
      /router\.post\(['"]\/ecosystem\/integrations\/register['"]/,
      /router\.get\(['"]\/summary['"]/
    ]
  }
];

const failures = [];

for (const check of checks) {
  const content = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      failures.push({
        id: check.id,
        file: check.file,
        pattern: String(pattern)
      });
    }
  }
}

if (failures.length > 0) {
  console.error('Route contract violations detected:');
  failures.forEach((failure) => {
    console.error(`- [${failure.id}] ${failure.file} missing ${failure.pattern}`);
  });
  process.exit(1);
}

console.log(`Route contract checks passed (${checks.length} checks).`);
