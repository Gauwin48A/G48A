#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'docs');
const reportMarkdownPath = path.join(reportDir, 'RELEASE_CLEANUP_CHECKLIST.md');
const reportJsonPath = path.join(reportDir, 'RELEASE_CLEANUP_CHECKLIST.json');
const OUTPUT_IGNORE_PATHS = new Set([
  normalizePath(path.relative(rootDir, reportMarkdownPath)),
  normalizePath(path.relative(rootDir, reportJsonPath))
]);

const SAFE_RESTORE_PREFIXES = [
  'client/node_modules/',
  'server/node_modules/',
  'client/dist/',
  'server/docs/artifacts/',
  'server/tests/load/results/',
  'client/android/app/src/main/assets/public/'
];

const SOURCE_PREFIXES = ['client/src/', 'server/src/'];
const DOC_PREFIXES = ['docs/', 'server/docs/'];
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

const MIGRATION_PREFIXES = ['server/database/', 'server/migrations/'];

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

function shouldIgnorePath(filePath) {
  return OUTPUT_IGNORE_PATHS.has(normalizePath(filePath));
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

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

function classifyReviewArea(entry) {
  const filePath = entry.path;
  if (startsWithAny(filePath, SOURCE_PREFIXES)) return 'source_code';
  if (isConfigPath(filePath)) return 'configuration';
  if (startsWithAny(filePath, MIGRATION_PREFIXES)) return 'database';
  if (startsWithAny(filePath, DOC_PREFIXES)) return 'documentation';
  return 'other';
}

function classifyEntry(entry) {
  if (startsWithAny(entry.path, SAFE_RESTORE_PREFIXES)) {
    return {
      bucket: 'safe_to_restore',
      reason: 'dependency_or_generated_artifact'
    };
  }

  return {
    bucket: 'intentional_review_required',
    reason: classifyReviewArea(entry)
  };
}

function actionFor(entry, bucket) {
  if (bucket === 'safe_to_restore') {
    return entry.status === 'untracked' ? 'delete_untracked' : 'restore_from_head';
  }

  if (entry.status === 'deleted') {
    return 'confirm_deletion_intent';
  }
  return 'confirm_change_intent';
}

function formatList(items, prefix = '- ') {
  if (!items.length) return `${prefix}none`;
  return items.map((value) => `${prefix}${value}`).join('\n');
}

function toRelativeDisplay(entry) {
  return `${entry.rawStatus} ${entry.path}`;
}

function takeTop(entries, limit = 50) {
  return entries.slice(0, limit).map(toRelativeDisplay);
}

function buildChecklist(entries) {
  const enrichedEntries = entries.map((entry) => {
    const classification = classifyEntry(entry);
    return {
      ...entry,
      ...classification,
      action: actionFor(entry, classification.bucket)
    };
  });

  const safeToRestore = enrichedEntries.filter((entry) => entry.bucket === 'safe_to_restore');
  const intentionalReview = enrichedEntries.filter((entry) => entry.bucket === 'intentional_review_required');
  const highRiskIntentional = intentionalReview.filter((entry) => {
    if (entry.status !== 'deleted') return false;
    return ['source_code', 'configuration', 'database'].includes(entry.reason);
  });

  const safeTracked = safeToRestore.filter((entry) => entry.status !== 'untracked');
  const safeUntracked = safeToRestore.filter((entry) => entry.status === 'untracked');

  const restoreTargets = SAFE_RESTORE_PREFIXES.filter((prefix) =>
    safeTracked.some((entry) => entry.path.startsWith(prefix))
  );
  const cleanTargets = SAFE_RESTORE_PREFIXES.filter((prefix) =>
    safeUntracked.some((entry) => entry.path.startsWith(prefix))
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      changedPaths: enrichedEntries.length,
      safeToRestore: safeToRestore.length,
      intentionalReview: intentionalReview.length,
      highRiskIntentionalDeletions: highRiskIntentional.length
    },
    byStatus: countBy(enrichedEntries, (entry) => entry.status),
    byBucket: countBy(enrichedEntries, (entry) => entry.bucket),
    byReason: countBy(enrichedEntries, (entry) => entry.reason),
    byTopLevel: countBy(enrichedEntries, (entry) => entry.path.split('/')[0] || '(root)'),
    commandHints: {
      restoreTrackedSafeChanges: restoreTargets.length
        ? `git restore --source=HEAD --staged --worktree -- ${restoreTargets.join(' ')}`
        : null,
      cleanUntrackedSafeChanges: cleanTargets.length
        ? `git clean -fd -- ${cleanTargets.join(' ')}`
        : null
    },
    safeToRestore,
    intentionalReview,
    highRiskIntentional
  };
}

function toMarkdown(report) {
  const byStatusLines = Object.entries(report.byStatus)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const byReasonLines = Object.entries(report.byReason)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const byTopLevelLines = Object.entries(report.byTopLevel)
    .slice(0, 15)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const blockerLines = [];
  if (report.totals.safeToRestore > 0) {
    blockerLines.push(`[BLOCKER] ${report.totals.safeToRestore} path(s) are likely safe-to-restore dependency/artifact churn.`);
  }
  if (report.totals.highRiskIntentionalDeletions > 0) {
    blockerLines.push(`[BLOCKER] ${report.totals.highRiskIntentionalDeletions} source/config/database deletion(s) need explicit intent confirmation.`);
  }
  if (!blockerLines.length) {
    blockerLines.push('[INFO] No automatic release blockers detected from worktree triage.');
  }

  const safeSample = takeTop(report.safeToRestore, 80);
  const intentionalSample = takeTop(report.intentionalReview, 80);
  const highRiskSample = takeTop(report.highRiskIntentional, 80);

  const restoreHint = report.commandHints.restoreTrackedSafeChanges
    ? `- ${report.commandHints.restoreTrackedSafeChanges}`
    : '- none';
  const cleanHint = report.commandHints.cleanUntrackedSafeChanges
    ? `- ${report.commandHints.cleanUntrackedSafeChanges}`
    : '- none';

  return [
    '# Release Cleanup Checklist',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Snapshot',
    `- Total changed paths: ${report.totals.changedPaths}`,
    `- Safe-to-restore paths: ${report.totals.safeToRestore}`,
    `- Intentional-review paths: ${report.totals.intentionalReview}`,
    `- High-risk intentional deletions: ${report.totals.highRiskIntentionalDeletions}`,
    '',
    '## Release Blockers',
    ...blockerLines.map((line, index) => `${index + 1}. ${line}`),
    '',
    '## Checklist',
    '- [ ] Re-run `git status --short` and confirm this snapshot still matches.',
    '- [ ] Restore tracked safe-to-restore changes.',
    '- [ ] Remove untracked safe-to-restore files/directories.',
    '- [ ] Review each intentional change and mark it KEEP or RESTORE.',
    '- [ ] Explicitly confirm every source/config/database deletion.',
    '- [ ] Run `npm run audit:worktree` and verify no BLOCKER findings remain.',
    '',
    '## Command Hints',
    '### Restore tracked safe changes',
    restoreHint,
    '',
    '### Clean untracked safe changes',
    cleanHint,
    '',
    '## Breakdown',
    '### By status',
    byStatusLines || '- none',
    '',
    '### By reason',
    byReasonLines || '- none',
    '',
    '### Top-level paths',
    byTopLevelLines || '- none',
    '',
    '## Samples',
    '### Safe-to-restore (first 80)',
    formatList(safeSample),
    '',
    '### Intentional-review (first 80)',
    formatList(intentionalSample),
    '',
    '### High-risk intentional deletions (first 80)',
    formatList(highRiskSample),
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
  const entries = lines
    .map(parseStatusLine)
    .filter((entry) => !shouldIgnorePath(entry.path));
  const report = buildChecklist(entries);
  const markdown = toMarkdown(report);

  ensureReportDir();
  fs.writeFileSync(reportMarkdownPath, markdown, 'utf8');
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('Release cleanup checklist generated.');
  console.log(`- markdown: ${path.relative(rootDir, reportMarkdownPath)}`);
  console.log(`- json:     ${path.relative(rootDir, reportJsonPath)}`);
  console.log(`- total changed: ${report.totals.changedPaths}`);
  console.log(`- safe-to-restore: ${report.totals.safeToRestore}`);
  console.log(`- intentional-review: ${report.totals.intentionalReview}`);
  console.log(`- high-risk deletions: ${report.totals.highRiskIntentionalDeletions}`);

  if (report.totals.safeToRestore > 0 || report.totals.highRiskIntentionalDeletions > 0) {
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  console.error('Failed to generate release cleanup checklist:', error.message);
  process.exit(1);
}
