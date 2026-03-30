#!/usr/bin/env node

const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, "../../..");
const targetDir = path.join(rootDir, 'client', 'src');
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const isCI = String(process.env.CI || '').toLowerCase() === 'true';
const allowOverride =
  String(process.env.ALLOW_HARDCODED_STRINGS || '').toLowerCase() === 'true';

const attrRegex = /(placeholder|title|alt|label|aria-label)=["']([^"'{}]+)["']/g;
const textRegex = />([^<>{}\n]+[^<>{}\n\s]*?)[\s]*</g;
const safeTextRegex = /^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]*$/;
const ignoreTextTokens = new Set(['&nbsp;', '&bull;']);

function runGit(args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function isValidRef(ref) {
  if (!ref) return false;
  try {
    runGit(['rev-parse', '--verify', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef() {
  const candidates = [];
  if (process.env.BASE_SHA) candidates.push(process.env.BASE_SHA);
  if (process.env.GITHUB_BASE_SHA) candidates.push(process.env.GITHUB_BASE_SHA);
  if (process.env.GITHUB_BASE_REF) {
    const base = process.env.GITHUB_BASE_REF;
    candidates.push(base, `origin/${base}`);
  }
  if (process.env.BASE_REF) {
    const base = process.env.BASE_REF;
    candidates.push(base, `origin/${base}`);
  }
  candidates.push('origin/main', 'origin/master', 'main', 'master');

  for (const ref of candidates) {
    if (isValidRef(ref)) {
      return ref;
    }
  }
  return null;
}

function loadDiff(baseRef) {
  const diffArgs = [
    'diff',
    '--unified=0',
    '--diff-filter=AM',
  ];
  if (baseRef) {
    diffArgs.push(`${baseRef}...HEAD`);
  }
  diffArgs.push('--', 'client/src');
  return runGit(diffArgs);
}

function shouldScanFile(filePath) {
  if (!filePath) return false;
  if (!filePath.startsWith('client/src/')) return false;
  return allowedExtensions.has(path.extname(filePath));
}

function extractAddedLines(diffText) {
  const findings = [];
  let currentFile = null;
  let currentLine = 0;

  const lines = diffText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('+++ ')) {
      const raw = line.slice(4).trim();
      if (raw === '/dev/null') {
        currentFile = null;
        continue;
      }
      currentFile = raw.startsWith('b/') ? raw.slice(2) : raw;
      currentLine = 0;
      continue;
    }
    if (line.startsWith('@@')) {
      const match = /\+(\d+)(?:,(\d+))?/.exec(line);
      currentLine = match ? Number(match[1]) : 0;
      continue;
    }
    if (!currentFile || !shouldScanFile(currentFile)) {
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1);
      findings.push({ filePath: currentFile, lineNumber: currentLine, content });
      currentLine += 1;
      continue;
    }
    if (line.startsWith(' ')) {
      currentLine += 1;
    }
  }

  return findings;
}

function scanLine({ filePath, lineNumber, content }) {
  const issues = [];
  const textMatches = content.matchAll(textRegex);
  for (const match of textMatches) {
    const text = String(match[1] || '').trim();
    if (!text || text.length <= 2) continue;
    if (safeTextRegex.test(text)) continue;
    if (ignoreTextTokens.has(text)) continue;
    issues.push({ filePath, lineNumber, type: 'Text', text });
  }

  const attrMatches = content.matchAll(attrRegex);
  for (const match of attrMatches) {
    const attr = match[1];
    const val = String(match[2] || '').trim();
    if (!val || val.length <= 2) continue;
    if (safeTextRegex.test(val)) continue;
    issues.push({ filePath, lineNumber, type: `Attr (${attr})`, text: val });
  }

  return issues;
}

function run() {
  const baseRef = resolveBaseRef();
  if (!baseRef && isCI) {
    console.error(
      'Unable to determine base ref for hardcoded-string diff. Set BASE_REF or GITHUB_BASE_REF.'
    );
    process.exit(1);
  }

  let diffText = '';
  try {
    diffText = loadDiff(baseRef);
  } catch (error) {
    if (isCI) {
      console.error('Failed to compute git diff for hardcoded-string guard.');
      console.error(error?.message || String(error));
      process.exit(1);
    }
    console.warn('Skipping hardcoded-string guard (diff unavailable).');
    process.exit(0);
  }

  if (!diffText.trim()) {
    console.log('No added client/src lines to scan for hardcoded strings.');
    process.exit(0);
  }

  const addedLines = extractAddedLines(diffText);
  const issues = [];
  for (const entry of addedLines) {
    issues.push(...scanLine(entry));
  }

  if (issues.length === 0) {
    console.log('No new hardcoded UI strings detected in added lines.');
    process.exit(0);
  }

  console.error(`Detected ${issues.length} new hardcoded UI string(s):`);
  issues.slice(0, 60).forEach((issue) => {
    console.error(
      `- ${issue.filePath}:${issue.lineNumber} [${issue.type}] "${issue.text}"`
    );
  });
  if (issues.length > 60) {
    console.error(`... ${issues.length - 60} more`);
  }

  if (allowOverride) {
    console.warn('ALLOW_HARDCODED_STRINGS override enabled; not failing.');
    process.exit(0);
  }

  process.exit(1);
}

run();

