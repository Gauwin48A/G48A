#!/usr/bin/env node

const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const TRACKED_DEP_PATTERNS = ['client/node_modules', 'server/node_modules'];

function getTrackedByPrefix(prefix) {
  const output = execFileSync('git', ['ls-files', prefix], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/'))
    .filter(Boolean);
}

try {
  const violations = TRACKED_DEP_PATTERNS.flatMap((prefix) =>
    getTrackedByPrefix(prefix).map((filePath) => ({ prefix, filePath }))
  );

  if (violations.length === 0) {
    console.log('Tracked dependency guard passed.');
    process.exit(0);
  }

  console.error(`Tracked dependency guard failed with ${violations.length} violation(s):`);
  for (const violation of violations.slice(0, 50)) {
    console.error(`- ${violation.filePath}`);
  }
  if (violations.length > 50) {
    console.error(`... ${violations.length - 50} more`);
  }

  console.error('');
  console.error('Remediation:');
  console.error('- Untrack folders from Git index: git rm -r --cached client/node_modules server/node_modules');
  console.error('- Keep .gitignore entries for node_modules.');
  process.exit(1);
} catch (error) {
  console.error('Tracked dependency guard crashed:', error.message);
  process.exit(1);
}
