#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, "../../..");

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vite',
  'coverage'
]);

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.mp4',
  '.mp3',
  '.wav',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.bin',
  '.exe',
  '.dll'
]);

const PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Temp Key', regex: /ASIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /ghp_[A-Za-z0-9]{36,}/ },
  { name: 'GitHub PAT', regex: /github_pat_[A-Za-z0-9_]{50,}/ },
  { name: 'Slack Token', regex: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'Stripe Secret (live)', regex: /sk_live_[0-9a-zA-Z]{16,}/ },
  { name: 'Stripe Secret (test)', regex: /sk_test_[0-9a-zA-Z]{16,}/ },
  { name: 'Square Access Token', regex: /sq0atp-[0-9A-Za-z-_]{20,}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP)? ?PRIVATE KEY-----/ }
];

function getTrackedFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: rootDir,
      encoding: 'utf8'
    });
    return output
      .split('\0')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, out);
    else if (entry.isFile()) out.push(path.relative(rootDir, filePath));
  }
  return out;
}

function isBinaryPath(filePath) {
  return BINARY_EXTS.has(path.extname(filePath).toLowerCase());
}

function readText(filePath) {
  const absPath = path.join(rootDir, filePath);
  const buffer = fs.readFileSync(absPath);
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

function scanFile(filePath) {
  if (isBinaryPath(filePath)) return [];
  const content = readText(filePath);
  if (content === null) return [];

  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          filePath,
          lineNumber: i + 1,
          pattern: pattern.name,
          line: line.trim().slice(0, 200)
        });
      }
    }
  }

  return findings;
}

function run() {
  const tracked = getTrackedFiles();
  const files = tracked || walk(rootDir);
  const findings = [];

  for (const filePath of files) {
    if (!filePath) continue;
    if (filePath.startsWith('.git/')) continue;
    if (IGNORE_DIRS.has(filePath.split(/[\\/]/)[0])) continue;
    findings.push(...scanFile(filePath));
  }

  if (findings.length === 0) {
    console.log('No secrets detected.');
    process.exit(0);
  }

  console.error(`Secrets scan failed with ${findings.length} finding(s):`);
  for (const finding of findings.slice(0, 50)) {
    console.error(
      `- ${finding.filePath}:${finding.lineNumber} [${finding.pattern}] ${finding.line}`
    );
  }
  if (findings.length > 50) {
    console.error(`... ${findings.length - 50} more`);
  }
  process.exit(1);
}

run();

