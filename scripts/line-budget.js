#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(__dirname, 'line-budget.config.json');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const token of argv) {
    if (!String(token).startsWith('--')) continue;
    const body = token.slice(2);
    const equalIndex = body.indexOf('=');
    if (equalIndex === -1) {
      args[body] = 'true';
      continue;
    }
    const key = body.slice(0, equalIndex);
    const value = body.slice(equalIndex + 1);
    args[key] = value;
  }
  return args;
}

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/');
}

function loadConfig(configPath) {
  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(rootDir, configPath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);

  const include = Array.isArray(parsed.include) ? parsed.include : [];
  const normalizedInclude = include
    .map((entry) => ({
      name: String(entry && entry.name ? entry.name : '').trim(),
      prefix: normalizePath(entry && entry.prefix ? entry.prefix : '')
    }))
    .filter((entry) => entry.name && entry.prefix);

  if (normalizedInclude.length === 0) {
    throw new Error('line budget config must define at least one include entry');
  }

  const extensions = Array.isArray(parsed.extensions) ? parsed.extensions : [];
  const normalizedExtensions = extensions
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('.') ? entry : `.${entry}`));

  if (normalizedExtensions.length === 0) {
    throw new Error('line budget config must define at least one extension');
  }

  const threshold = parsePositiveInt(parsed.threshold, 50000);
  return {
    threshold,
    include: normalizedInclude,
    extensions: normalizedExtensions,
    sourcePath: resolvedPath
  };
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function countLines(relativeFilePath) {
  const absolutePath = path.join(rootDir, relativeFilePath);
  const data = fs.readFileSync(absolutePath, 'utf8');
  if (data.length === 0) return 0;
  return data.split(/\r?\n/).length;
}

function findIncludeGroup(relativePath, includeEntries) {
  const normalized = normalizePath(relativePath);
  for (const entry of includeEntries) {
    if (normalized.startsWith(entry.prefix)) return entry;
  }
  return null;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || 'report').trim().toLowerCase();
  if (!['report', 'guard'].includes(mode)) {
    throw new Error(`invalid mode "${mode}". Use --mode=report or --mode=guard`);
  }

  const configPath = args.config || defaultConfigPath;
  const config = loadConfig(configPath);
  const threshold = parsePositiveInt(args.threshold, config.threshold);

  const trackedFiles = getTrackedFiles();
  const bucketTotals = new Map(config.include.map((entry) => [entry.name, { files: 0, lines: 0 }]));
  const countedFiles = [];

  for (const relativePath of trackedFiles) {
    const includeEntry = findIncludeGroup(relativePath, config.include);
    if (!includeEntry) continue;

    const extension = path.extname(relativePath).toLowerCase();
    if (!config.extensions.includes(extension)) continue;

    let lines = 0;
    try {
      lines = countLines(relativePath);
    } catch {
      continue;
    }

    const bucket = bucketTotals.get(includeEntry.name);
    bucket.files += 1;
    bucket.lines += lines;
    countedFiles.push({ path: relativePath, lines, bucket: includeEntry.name });
  }

  const totalLines = countedFiles.reduce((sum, file) => sum + file.lines, 0);
  const totalFiles = countedFiles.length;
  const withinBudget = totalLines <= threshold;
  const delta = threshold - totalLines;

  console.log('Codebase Line Budget Report');
  console.log(`- mode: ${mode}`);
  console.log(`- config: ${path.relative(rootDir, config.sourcePath).replace(/\\/g, '/')}`);
  console.log(`- included files: ${formatNumber(totalFiles)}`);
  console.log(`- total lines: ${formatNumber(totalLines)}`);
  console.log(`- threshold: ${formatNumber(threshold)}`);
  console.log(`- remaining budget: ${formatNumber(delta)}`);
  console.log(`- status: ${withinBudget ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('Breakdown by scope:');

  const breakdown = [...bucketTotals.entries()]
    .sort((left, right) => right[1].lines - left[1].lines);
  for (const [name, metrics] of breakdown) {
    console.log(`- ${name}: ${formatNumber(metrics.lines)} lines across ${formatNumber(metrics.files)} files`);
  }

  console.log('');
  console.log('Top files by lines:');
  const topFiles = countedFiles
    .slice()
    .sort((left, right) => right.lines - left.lines)
    .slice(0, 20);
  for (const file of topFiles) {
    console.log(`- ${file.lines}\t${file.path}`);
  }

  console.log('');
  console.log(`CODEBASE_LINE_BUDGET_STATUS=${withinBudget ? 'PASS' : 'FAIL'}`);
  console.log(`CODEBASE_LINE_BUDGET_TOTAL=${totalLines}`);
  console.log(`CODEBASE_LINE_BUDGET_THRESHOLD=${threshold}`);

  if (mode === 'guard' && !withinBudget) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`Codebase line budget check failed: ${error.message}`);
  process.exit(1);
}
