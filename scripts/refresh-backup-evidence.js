#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const equalIndex = token.indexOf('=');
    if (equalIndex > 2) {
      args[token.slice(2, equalIndex)] = token.slice(equalIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const hasValue = next !== undefined && !String(next).startsWith('--');
    args[key] = hasValue ? next : 'true';
    if (hasValue) index += 1;
  }
  return args;
}

function resolveNpmInvocation(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      commandArgs: ['/d', '/s', '/c', 'npm', ...args]
    };
  }
  return {
    command: 'npm',
    commandArgs: args
  };
}

function runServerBackupDrill({ restoreDrill, dryRun }) {
  const scriptArgs = ['run', 'backup:drill'];
  const forwardArgs = [];
  if (restoreDrill) forwardArgs.push('--restore-drill=true');
  if (dryRun) forwardArgs.push('--dry-run=true');
  if (forwardArgs.length > 0) {
    scriptArgs.push('--', ...forwardArgs);
  }

  const invocation = resolveNpmInvocation(scriptArgs);
  const result = spawnSync(invocation.command, invocation.commandArgs, {
    cwd: serverDir,
    shell: false,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function readNewestEvidence(evidenceDir) {
  if (!fs.existsSync(evidenceDir)) {
    return { status: 'missing', reason: `evidence directory not found: ${evidenceDir}` };
  }

  const candidates = fs.readdirSync(evidenceDir)
    .map((name) => path.join(evidenceDir, name))
    .filter((filePath) => filePath.toLowerCase().endsWith('.json'))
    .map((filePath) => {
      try {
        return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (candidates.length === 0) {
    return { status: 'missing', reason: `no backup evidence json found in ${evidenceDir}` };
  }

  const newest = candidates[0];
  try {
    const payload = JSON.parse(fs.readFileSync(newest.filePath, 'utf8'));
    return { status: 'ok', newestFile: newest.filePath, mtimeMs: newest.mtimeMs, payload };
  } catch (error) {
    return { status: 'invalid', newestFile: newest.filePath, reason: `invalid json payload: ${error.message}` };
  }
}

function validateEvidencePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'evidence payload must be a JSON object' };
  }

  const backupSize = Number(payload.backup_size_bytes);
  if (!Number.isFinite(backupSize) || backupSize <= 0) {
    return { valid: false, reason: 'backup_size_bytes is missing or invalid' };
  }

  const restoreHealth = String(payload.restore_health || '').toLowerCase();
  if (!['skipped', 'passed'].includes(restoreHealth)) {
    return { valid: false, reason: 'restore_health must be "skipped" or "passed"' };
  }

  const timestampUtc = Date.parse(String(payload.timestamp_utc || ''));
  if (!Number.isFinite(timestampUtc)) {
    return { valid: false, reason: 'timestamp_utc is missing or invalid' };
  }

  const backupFile = String(payload.backup_file || '').trim();
  if (!backupFile) {
    return { valid: false, reason: 'backup_file is missing' };
  }

  return { valid: true };
}

function evaluateFreshness(record, maxAgeHours) {
  if (record.status !== 'ok') return record;

  const ageHours = (Date.now() - record.mtimeMs) / (1000 * 60 * 60);
  if (!Number.isFinite(ageHours) || ageHours > maxAgeHours) {
    return {
      status: 'stale',
      newestFile: record.newestFile,
      ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
      reason: `newest backup evidence older than ${maxAgeHours}h`
    };
  }

  const validity = validateEvidencePayload(record.payload);
  if (!validity.valid) {
    return {
      status: 'invalid',
      newestFile: record.newestFile,
      ageHours: Number(ageHours.toFixed(2)),
      reason: validity.reason
    };
  }

  return {
    status: 'ok',
    newestFile: record.newestFile,
    ageHours: Number(ageHours.toFixed(2))
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const maxAgeHours = parsePositiveInt(
    args['max-age-hours'] || process.env.BACKUP_EVIDENCE_MAX_AGE_HOURS || '24',
    24
  );
  const evidenceDir = path.resolve(
    rootDir,
    args['evidence-dir'] || process.env.BACKUP_EVIDENCE_DIR || path.join('server', 'backups', 'evidence')
  );
  const force = parseBoolean(args.force, false);
  const restoreDrill = parseBoolean(args['restore-drill'] ?? process.env.RUN_RESTORE_DRILL, false);
  const dryRun = parseBoolean(args['dry-run'], false);

  const current = evaluateFreshness(readNewestEvidence(evidenceDir), maxAgeHours);

  if (!force && current.status === 'ok') {
    console.log('[backup-evidence] Fresh evidence already available; skipping refresh.');
    console.log(`BACKUP_EVIDENCE_REFRESH_STATUS=SKIPPED_FRESH`);
    console.log(`BACKUP_EVIDENCE_FILE=${current.newestFile}`);
    console.log(`BACKUP_EVIDENCE_AGE_HOURS=${current.ageHours}`);
    return;
  }

  console.log('[backup-evidence] Refreshing backup drill evidence...');
  const drillResult = runServerBackupDrill({ restoreDrill, dryRun });
  if (drillResult.error) {
    console.error(`[backup-evidence] backup drill launch failed: ${drillResult.error.message}`);
    process.exit(1);
  }
  if (drillResult.status !== 0) {
    console.error(`[backup-evidence] backup drill failed with exit code ${drillResult.status || 1}`);
    process.exit(drillResult.status || 1);
  }

  if (dryRun) {
    console.log('BACKUP_EVIDENCE_REFRESH_STATUS=DRY_RUN');
    return;
  }

  const refreshed = evaluateFreshness(readNewestEvidence(evidenceDir), maxAgeHours);
  if (refreshed.status !== 'ok') {
    console.error(`[backup-evidence] refresh completed but evidence is not usable: ${refreshed.reason}`);
    process.exit(1);
  }

  console.log('[backup-evidence] Backup evidence refresh complete.');
  console.log(`BACKUP_EVIDENCE_REFRESH_STATUS=COMPLETE`);
  console.log(`BACKUP_EVIDENCE_FILE=${refreshed.newestFile}`);
  console.log(`BACKUP_EVIDENCE_AGE_HOURS=${refreshed.ageHours}`);
}

try {
  main();
} catch (error) {
  console.error(`[backup-evidence] refresh failed: ${error.message}`);
  process.exit(1);
}
