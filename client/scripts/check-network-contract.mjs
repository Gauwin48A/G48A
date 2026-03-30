import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const clientRoot = dirname(scriptDir);

function read(relativePath) {
  return readFileSync(join(clientRoot, relativePath), 'utf8');
}

const checks = [
  {
    id: 'bootstrap-preflight-before-render',
    file: 'src/main.jsx',
    patterns: [
      /React\.lazy\(\(\)\s*=>\s*import\(['"]\.\/App\.jsx['"]\)\)/,
      /runBackendPreflight\(\)/,
      /BackendUnavailableScreen/
    ]
  },
  {
    id: 'runtime-origin-override-network-config',
    file: 'src/lib/networkConfig.js',
    patterns: [
      /__MHUB_API_ORIGIN_OVERRIDE__/,
      /export function getApiRootUrl\(/,
      /export function getSocketUrl\(/,
      /export function buildApiPath\(/
    ]
  },
  {
    id: 'socket-contract',
    file: 'src/lib/socket.js',
    patterns: [
      /path:\s*['"]\/socket\.io['"]/,
      /reconnectionAttempts:/,
      /timeout:/
    ]
  },
  {
    id: 'auth-refresh-contract',
    file: 'src/context/AuthContext.jsx',
    patterns: [
      /\/auth\/refresh-token/,
      /\/auth\/me/
    ]
  },
  {
    id: 'categories-contract',
    file: 'src/services/categoriesService.js',
    patterns: [
      /\.get\(['"]\/categories['"]\)/
    ]
  },
  {
    id: 'for-you-feed-contract',
    file: 'src/pages/AllPosts.jsx',
    patterns: [
      /\/posts\/for-you/
    ]
  },
  {
    id: 'location-sync-contract',
    file: 'src/services/locationService.js',
    patterns: [
      /buildApiPath\(['"]\/location['"]\)/,
      /export async function sendLocation\(/
    ]
  },
  {
    id: 'api-auto-recovery-contract',
    file: 'src/services/api.js',
    patterns: [
      /resolveLocalDevBackendOrigin/,
      /isRouteNotFoundResponse/,
      /_backendRecoveryAttempted/,
      /__MHUB_API_ORIGIN_OVERRIDE__/
    ]
  }
];

const violations = [];

for (const check of checks) {
  const content = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      violations.push({
        checkId: check.id,
        file: check.file,
        pattern: String(pattern)
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Network contract violations detected:');
  for (const violation of violations) {
    console.error(`- [${violation.checkId}] ${violation.file} missing ${violation.pattern}`);
  }
  process.exit(1);
}

console.log(`Network contract checks passed (${checks.length} checks).`);
