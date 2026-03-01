#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isAggressive = process.argv.includes('--aggressive');
const confirmRemoveDeps = process.argv.includes('--confirm-remove-deps');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function pathExists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getPathSize(targetPath) {
  if (!pathExists(targetPath)) return 0;
  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    return 0;
  }
  if (stat.isFile()) return stat.size;

  let total = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(targetPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      total += getPathSize(fullPath);
    } else if (entry.isFile()) {
      try {
        total += fs.statSync(fullPath).size;
      } catch {
        // File may disappear during cleanup operations.
      }
    }
  }
  return total;
}

function removePath(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!pathExists(fullPath)) {
    return { relativePath, removed: false, bytes: 0 };
  }

  const bytes = getPathSize(fullPath);
  fs.rmSync(fullPath, { recursive: true, force: true });
  return { relativePath, removed: true, bytes };
}

function removeFilesByPattern(relativeDir, matcher) {
  const dirPath = path.join(rootDir, relativeDir);
  if (!pathExists(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const removed = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!matcher(entry.name)) continue;
    const filePath = path.join(dirPath, entry.name);
    const bytes = fs.statSync(filePath).size;
    fs.rmSync(filePath, { force: true });
    removed.push({ relativePath: path.join(relativeDir, entry.name), removed: true, bytes });
  }
  return removed;
}

function dedupeTopLevelPublicLocales() {
  const localesRoot = path.join(rootDir, 'client', 'public', 'locales');
  if (!pathExists(localesRoot)) return [];

  const entries = fs.readdirSync(localesRoot, { withFileTypes: true });
  const removed = [];
  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== '.json') continue;

    const languageCode = path.basename(entry.name, '.json');
    const nestedTranslationPath = path.join(localesRoot, languageCode, 'translation.json');
    if (!pathExists(nestedTranslationPath)) continue;

    const topLevelPath = path.join(localesRoot, entry.name);
    const bytes = fs.statSync(topLevelPath).size;
    fs.rmSync(topLevelPath, { force: true });
    removed.push({
      relativePath: path.join('client/public/locales', entry.name),
      removed: true,
      bytes
    });
  }

  return removed;
}

const standardTargets = [
  'client/dist',
  'client/android/app/src/main/assets/public',
  'server/tests/load/results',
  'server/docs/artifacts'
];

const aggressiveTargets = [
  'client/node_modules',
  'server/node_modules',
  'client/android/app/build',
  'client/android/build',
  'client/android/.gradle'
];

const removedEntries = [];
for (const target of standardTargets) {
  removedEntries.push(removePath(target));
}

if (isAggressive && confirmRemoveDeps) {
  for (const target of aggressiveTargets) {
    removedEntries.push(removePath(target));
  }
}

removedEntries.push(
  ...removeFilesByPattern('client', (name) => /^build.*\.(txt|log)$/i.test(name)),
  ...removeFilesByPattern('client', (name) => /^tmpclaude-.*$/i.test(name)),
  ...removeFilesByPattern('server', (name) => /\.(err\.)?log$/i.test(name)),
  ...dedupeTopLevelPublicLocales()
);

const actuallyRemoved = removedEntries.filter((entry) => entry.removed);
const reclaimedBytes = actuallyRemoved.reduce((sum, entry) => sum + entry.bytes, 0);

console.log('Footprint optimization complete.');
console.log(`Mode: ${isAggressive ? (confirmRemoveDeps ? 'aggressive' : 'aggressive-no-deps') : 'standard'}`);
if (isAggressive && !confirmRemoveDeps) {
  console.log('Dependency folders were preserved. Use --confirm-remove-deps to remove node_modules and Gradle caches.');
}
console.log(`Removed paths: ${actuallyRemoved.length}`);
console.log(`Estimated reclaimed: ${formatBytes(reclaimedBytes)}`);

if (actuallyRemoved.length > 0) {
  for (const entry of actuallyRemoved) {
    console.log(`- ${entry.relativePath} (${formatBytes(entry.bytes)})`);
  }
}
