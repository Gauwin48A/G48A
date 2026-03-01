#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targets = [
  'client',
  'server',
  'client/node_modules',
  'server/node_modules',
  'client/dist',
  'client/android/app/src/main/assets/public',
  'server/docs/artifacts',
  'server/tests/load/results'
];

function pathExists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getPathSize(fullPath) {
  if (!pathExists(fullPath)) return 0;
  let stats;
  try {
    stats = fs.statSync(fullPath);
  } catch {
    return 0;
  }
  if (stats.isFile()) return stats.size;

  let entries = [];
  try {
    entries = fs.readdirSync(fullPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      total += getPathSize(entryPath);
    } else if (entry.isFile()) {
      try {
        total += fs.statSync(entryPath).size;
      } catch {
        // File was removed between directory read and stat.
      }
    }
  }
  return total;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

console.log('Footprint Report');
for (const relativeTarget of targets) {
  const fullPath = path.join(rootDir, relativeTarget);
  const size = getPathSize(fullPath);
  const status = pathExists(fullPath) ? 'present' : 'missing';
  console.log(`- ${relativeTarget}: ${formatMB(size)} (${status})`);
}
