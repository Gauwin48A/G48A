#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function collectJsonFiles(relativeDir, recursive = true) {
  const dirPath = path.join(rootDir, relativeDir);
  if (!fs.existsSync(dirPath)) return [];

  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...collectJsonFiles(relPath, true));
      }
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
      files.push(fullPath);
    }
  }

  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function minifyJsonFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const normalizedOriginal = original.replace(/^\uFEFF/, '');
  const originalBytes = Buffer.byteLength(original, 'utf8');

  let parsed;
  let repaired = false;
  try {
    parsed = JSON.parse(normalizedOriginal);
  } catch {
    // Some locale files are accidentally stored with escaped key/value quotes.
    // Attempt a safe repair pass before giving up.
    const repairedCandidate = normalizedOriginal.replace(/\\"/g, '"');
    try {
      parsed = JSON.parse(repairedCandidate);
      repaired = true;
    } catch {
      return { changed: false, skipped: true, filePath, originalBytes, minifiedBytes: originalBytes };
    }
  }

  const minified = `${JSON.stringify(parsed)}\n`;
  const minifiedBytes = Buffer.byteLength(minified, 'utf8');

  if (minifiedBytes >= originalBytes) {
    return { changed: false, skipped: false, originalBytes, minifiedBytes };
  }

  fs.writeFileSync(filePath, minified, 'utf8');
  return { changed: true, skipped: false, repaired, originalBytes, minifiedBytes };
}

const targets = [
  ...collectJsonFiles('client/public/locales', true),
  ...collectJsonFiles('client/src/locales', false)
];

let totalOriginal = 0;
let totalMinified = 0;
let changedCount = 0;
let skippedCount = 0;
let repairedCount = 0;
const skippedFiles = [];

for (const target of targets) {
  const outcome = minifyJsonFile(target);
  totalOriginal += outcome.originalBytes;
  totalMinified += outcome.minifiedBytes;
  if (outcome.changed) changedCount += 1;
  if (outcome.repaired) repairedCount += 1;
  if (outcome.skipped) {
    skippedCount += 1;
    skippedFiles.push(path.relative(rootDir, outcome.filePath).replace(/\\/g, '/'));
  }
}

const saved = Math.max(0, totalOriginal - totalMinified);
console.log('Locale optimization complete.');
console.log(`Files scanned: ${targets.length}`);
console.log(`Files minified: ${changedCount}`);
console.log(`Files repaired: ${repairedCount}`);
console.log(`Files skipped (invalid JSON): ${skippedCount}`);
console.log(`Saved: ${formatBytes(saved)}`);
if (skippedFiles.length) {
  console.log('Skipped files:');
  for (const skippedFile of skippedFiles) {
    console.log(`- ${skippedFile}`);
  }
}
