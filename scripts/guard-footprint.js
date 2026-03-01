#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const strictTracked = process.argv.includes('--strict-tracked');

const FORBIDDEN_PATH_RULES = [
  {
    description: 'client node_modules',
    pattern: /^client\/node_modules(\/|$)/i,
    enforceInPresentMode: false
  },
  {
    description: 'server node_modules',
    pattern: /^server\/node_modules(\/|$)/i,
    enforceInPresentMode: false
  },
  { description: 'client dist output', pattern: /^client\/dist(\/|$)/i },
  { description: 'capacitor generated web assets', pattern: /^client\/android\/app\/src\/main\/assets\/public(\/|$)/i },
  {
    description: 'server docs artifacts',
    pattern: /^server\/docs\/artifacts(\/|$)/i,
    enforceInPresentMode: false
  },
  {
    description: 'server load-test results',
    pattern: /^server\/tests\/load\/results(\/|$)/i,
    enforceInPresentMode: false
  },
  {
    description: 'client build logs/reports',
    pattern: /^client\/build.*\.(txt|log)$/i,
    enforceInPresentMode: false
  },
  {
    description: 'server logs',
    pattern: /^server\/.*\.log$/i,
    enforceInPresentMode: false
  },
  {
    description: 'temporary Claude markers',
    pattern: /^client\/tmpclaude-/i,
    enforceInPresentMode: false
  }
];

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\\/g, '/'));
}

function findViolations(files) {
  const violations = [];

  for (const relativePath of files) {
    for (const rule of FORBIDDEN_PATH_RULES) {
      if (!strictTracked && rule.enforceInPresentMode === false) continue;
      if (!rule.pattern.test(relativePath)) continue;

      const shouldCount = strictTracked
        ? true
        : fs.existsSync(path.join(rootDir, relativePath));

      if (!shouldCount) continue;

      violations.push({
        path: relativePath,
        reason: rule.description
      });
      break;
    }
  }

  return violations;
}

try {
  const trackedFiles = getTrackedFiles();
  const violations = findViolations(trackedFiles);

  if (violations.length === 0) {
    console.log(`Footprint guard passed (${strictTracked ? 'strict-tracked' : 'present-files'} mode).`);
    process.exit(0);
  }

  console.error(`Footprint guard failed with ${violations.length} violation(s):`);
  for (const violation of violations.slice(0, 200)) {
    console.error(`- ${violation.path} [${violation.reason}]`);
  }
  if (violations.length > 200) {
    console.error(`... ${violations.length - 200} more`);
  }

  console.error('');
  console.error('Remediation:');
  console.error('- Run: npm run optimize:footprint:aggressive');
  console.error('- Then commit deletion of generated/bloat artifacts.');
  process.exit(1);
} catch (error) {
  console.error('Footprint guard crashed:', error.message);
  process.exit(1);
}
