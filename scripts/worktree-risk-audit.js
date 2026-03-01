#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'docs');
const reportMarkdownPath = path.join(reportDir, 'WORKTREE_RISK_REPORT.md');
const reportJsonPath = path.join(reportDir, 'WORKTREE_RISK_REPORT.json');

const DEPENDENCY_PREFIXES = ['client/node_modules/', 'server/node_modules/'];
const ARTIFACT_PREFIXES = [
  'server/docs/artifacts/',
  'server/tests/load/results/',
  'client/dist/',
  'client/android/app/src/main/assets/public/'
];
const SOURCE_PREFIXES = ['client/src/', 'server/src/'];
const CONFIG_PATTERNS = [
  /^package\.json$/,
  /^server\/package\.json$/,
  /^client\/package\.json$/,
  /^package-lock\.json$/,
  /^server\/package-lock\.json$/,
  /^client\/package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^client\/vite\.config\.[a-z]+$/i,
  /^server\/src\/index\.js$/,
  /^\.github\/workflows\//,
  /^server\/\.env\.example$/,
  /^client\/\.env\.example$/
];

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/');
}

function startsWithAny(value, prefixes) {
  const normalized = normalizePath(value);
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function isConfigPath(value) {
  const normalized = normalizePath(value);
  return CONFIG_PATTERNS.some((pattern) => pattern.test(normalized));
}

function runGitStatus() {
  const output = execFileSync('git', ['status', '--porcelain=v1'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function parseStatusCode(rawStatus) {
  if (rawStatus === '??') return 'untracked';
  if (rawStatus.includes('R')) return 'renamed';
  if (rawStatus.includes('D')) return 'deleted';
  if (rawStatus.includes('A')) return 'added';
  if (rawStatus.includes('M')) return 'modified';
  return 'other';
}

function parseStatusLine(line) {
  const rawStatus = line.slice(0, 2);
  const status = parseStatusCode(rawStatus);
  const rawPath = line.slice(3);
  let oldPath = null;
  let filePath = rawPath;
  if (rawPath.includes(' -> ')) {
    const parts = rawPath.split(' -> ');
    if (parts.length === 2) {
      oldPath = normalizePath(parts[0]);
      filePath = parts[1];
    }
  }
  return {
    raw: line,
    rawStatus,
    status,
    path: normalizePath(filePath),
    oldPath
  };
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

function takeSample(items, limit = 25) {
  return items.slice(0, limit).map((item) => item.path);
}

function formatList(items) {
  if (!items.length) return '- none';
  return items.map((value) => `- ${value}`).join('\n');
}

function buildReport(entries) {
  const total = entries.length;
  const byStatus = countBy(entries, (item) => item.status);
  const byTopLevel = countBy(entries, (item) => item.path.split('/')[0] || '(root)');

  const dependencyChanges = entries.filter((item) => startsWithAny(item.path, DEPENDENCY_PREFIXES));
  const artifactChanges = entries.filter((item) => startsWithAny(item.path, ARTIFACT_PREFIXES));
  const sourceChanges = entries.filter((item) => startsWithAny(item.path, SOURCE_PREFIXES));
  const sourceDeletions = sourceChanges.filter((item) => item.status === 'deleted');
  const configChanges = entries.filter((item) => isConfigPath(item.path));
  const configDeletions = configChanges.filter((item) => item.status === 'deleted');
  const untrackedChanges = entries.filter((item) => item.status === 'untracked');

  const findings = [];
  if (total > 500) {
    findings.push({
      severity: 'BLOCKER',
      message: `Very large worktree delta (${total} files). High release risk until scope is reduced.`
    });
  }
  if (dependencyChanges.length > 0) {
    findings.push({
      severity: 'BLOCKER',
      message: `Tracked dependency churn detected (${dependencyChanges.length} changes under node_modules).`
    });
  }
  if (sourceDeletions.length > 0) {
    findings.push({
      severity: 'BLOCKER',
      message: `Source file deletions detected (${sourceDeletions.length} files under client/src or server/src).`
    });
  }
  if (configDeletions.length > 0) {
    findings.push({
      severity: 'BLOCKER',
      message: `Critical config deletions detected (${configDeletions.length} files).`
    });
  }
  if (artifactChanges.length > 0) {
    findings.push({
      severity: 'INFO',
      message: `Generated artifact churn detected (${artifactChanges.length} files). Usually safe but verify intent.`
    });
  }
  if (untrackedChanges.length > 200) {
    findings.push({
      severity: 'WARN',
      message: `Large untracked set (${untrackedChanges.length} files). Risk of missing files in release scope.`
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: 'INFO',
      message: 'No high-risk worktree anomalies detected.'
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    total,
    byStatus,
    byTopLevel,
    counts: {
      dependencyChanges: dependencyChanges.length,
      artifactChanges: artifactChanges.length,
      sourceChanges: sourceChanges.length,
      sourceDeletions: sourceDeletions.length,
      configChanges: configChanges.length,
      configDeletions: configDeletions.length,
      untrackedChanges: untrackedChanges.length
    },
    findings,
    samples: {
      dependencyChanges: takeSample(dependencyChanges),
      artifactChanges: takeSample(artifactChanges),
      sourceDeletions: takeSample(sourceDeletions),
      configDeletions: takeSample(configDeletions)
    }
  };
}

function toMarkdown(report) {
  const findingsLines = report.findings
    .map((finding, index) => `${index + 1}. [${finding.severity}] ${finding.message}`)
    .join('\n');

  const byStatusLines = Object.entries(report.byStatus)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
  const byTopLevelLines = Object.entries(report.byTopLevel)
    .slice(0, 15)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  return [
    '# Worktree Risk Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    `- Total changed paths: ${report.total}`,
    `- Dependency changes: ${report.counts.dependencyChanges}`,
    `- Artifact changes: ${report.counts.artifactChanges}`,
    `- Source changes: ${report.counts.sourceChanges}`,
    `- Source deletions: ${report.counts.sourceDeletions}`,
    `- Config changes: ${report.counts.configChanges}`,
    `- Config deletions: ${report.counts.configDeletions}`,
    `- Untracked changes: ${report.counts.untrackedChanges}`,
    '',
    '## Risk Findings',
    findingsLines,
    '',
    '## Status Breakdown',
    byStatusLines || '- none',
    '',
    '## Top-Level Breakdown',
    byTopLevelLines || '- none',
    '',
    '## Samples',
    '### Dependency Changes',
    formatList(report.samples.dependencyChanges),
    '',
    '### Artifact Changes',
    formatList(report.samples.artifactChanges),
    '',
    '### Source Deletions',
    formatList(report.samples.sourceDeletions),
    '',
    '### Config Deletions',
    formatList(report.samples.configDeletions),
    ''
  ].join('\n');
}

function ensureReportDir() {
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
}

function main() {
  const lines = runGitStatus();
  const entries = lines.map(parseStatusLine);
  const report = buildReport(entries);
  const markdown = toMarkdown(report);
  ensureReportDir();
  fs.writeFileSync(reportMarkdownPath, markdown, 'utf8');
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('Worktree risk audit complete.');
  console.log(`- report: ${path.relative(rootDir, reportMarkdownPath)}`);
  console.log(`- json:   ${path.relative(rootDir, reportJsonPath)}`);
  for (const finding of report.findings) {
    console.log(`- [${finding.severity}] ${finding.message}`);
  }

  const hasBlocker = report.findings.some((finding) => finding.severity === 'BLOCKER');
  if (hasBlocker) {
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  console.error('Worktree risk audit failed:', error.message);
  process.exit(1);
}
