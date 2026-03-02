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
    const hasInlineValue = argv[index + 1] !== undefined && !String(argv[index + 1]).startsWith('--');
    args[key] = hasInlineValue ? argv[index + 1] : 'true';
    if (hasInlineValue) index += 1;
  }
  return args;
}

function runNpm(cwd, args) {
  const invocation = process.platform === 'win32'
    ? { command: 'cmd.exe', commandArgs: ['/d', '/s', '/c', 'npm', ...args] }
    : { command: 'npm', commandArgs: args };

  const result = spawnSync(invocation.command, invocation.commandArgs, {
    cwd,
    shell: false,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function parseOutputValue(output, key) {
  const pattern = new RegExp(`^${key}=(.+)$`, 'm');
  const match = String(output || '').match(pattern);
  return match ? match[1].trim() : null;
}

function evaluateBackupEvidence({
  evidenceDir,
  maxAgeHours,
  allowSyntheticEvidence = false,
  requireRestorePass = false,
  skipBackupFileCheck = false
}) {
  if (!fs.existsSync(evidenceDir)) {
    return {
      status: 'missing',
      reason: `evidence directory not found: ${evidenceDir}`
    };
  }

  const files = fs.readdirSync(evidenceDir)
    .map((name) => path.join(evidenceDir, name))
    .filter((filePath) => filePath.toLowerCase().endsWith('.json'))
    .map((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        return { filePath, mtimeMs: stats.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (files.length === 0) {
    return {
      status: 'missing',
      reason: `no backup evidence json found in ${evidenceDir}`
    };
  }

  const newest = files[0];
  const ageHours = (Date.now() - newest.mtimeMs) / (1000 * 60 * 60);
  if (!Number.isFinite(ageHours) || ageHours > maxAgeHours) {
    return {
      status: 'stale',
      newestFile: newest.filePath,
      ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
      reason: `newest backup evidence older than ${maxAgeHours}h`
    };
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(newest.filePath, 'utf8'));
  } catch (error) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: `invalid json payload: ${error.message}`
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'evidence payload must be a JSON object'
    };
  }

  if (parseBoolean(payload.dry_run, false)) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'dry-run evidence is not valid for operational gating'
    };
  }

  const isSynthetic = parseBoolean(payload.synthetic ?? payload.is_synthetic, false);
  if (isSynthetic && !allowSyntheticEvidence) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'synthetic backup evidence is not allowed by policy'
    };
  }

  const backupSizeBytes = Number(payload.backup_size_bytes);
  if (!Number.isFinite(backupSizeBytes) || backupSizeBytes <= 0) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'backup_size_bytes is missing or invalid'
    };
  }

  const restoreHealth = String(payload.restore_health || '').trim().toLowerCase();
  if (!['passed', 'skipped'].includes(restoreHealth)) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'restore_health must be "passed" or "skipped"'
    };
  }

  const restoreExecuted = parseBoolean(payload.restore_executed, false);
  if (restoreExecuted && restoreHealth !== 'passed') {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'restore_executed evidence requires restore_health=passed'
    };
  }

  if (requireRestorePass && restoreHealth !== 'passed') {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'policy requires restore drill to pass in latest evidence'
    };
  }

  const timestampUtc = String(payload.timestamp_utc || '').trim();
  const parsedTimestamp = Date.parse(timestampUtc);
  if (!timestampUtc || !Number.isFinite(parsedTimestamp)) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'timestamp_utc is missing or invalid'
    };
  }

  const backupFileRaw = String(payload.backup_file || '').trim();
  if (!backupFileRaw) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: 'backup_file is missing'
    };
  }
  const backupFile = path.isAbsolute(backupFileRaw)
    ? backupFileRaw
    : path.resolve(evidenceDir, backupFileRaw);

  if (!skipBackupFileCheck && !fs.existsSync(backupFile)) {
    return {
      status: 'invalid',
      newestFile: newest.filePath,
      ageHours: Number(ageHours.toFixed(2)),
      reason: `backup_file referenced by evidence does not exist: ${backupFile}`
    };
  }

  return {
    status: 'ok',
    newestFile: newest.filePath,
    ageHours: Number(ageHours.toFixed(2)),
    backupFile,
    backupSizeBytes,
    restoreHealth,
    restoreExecuted,
    timestampUtc
  };
}

function refreshBackupEvidence({ maxAgeHours, force = false, restoreDrill = false } = {}) {
  const args = ['run', 'backup:evidence:refresh', '--', `--max-age-hours=${maxAgeHours}`];
  if (force) args.push('--force=true');
  if (restoreDrill) args.push('--restore-drill=true');

  const result = runNpm(rootDir, args);
  if (result.error) {
    return {
      attempted: true,
      ok: false,
      reason: result.error.message,
      exitCode: 1
    };
  }
  if (result.status !== 0) {
    return {
      attempted: true,
      ok: false,
      reason: `backup evidence refresh failed with exit code ${result.status || 1}`,
      exitCode: result.status || 1
    };
  }
  return {
    attempted: true,
    ok: true,
    reason: null,
    exitCode: 0
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = parseBoolean(args.strict ?? process.env.OPS_GATE_STRICT, false);
  const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const enforceFailover = parseBoolean(
    args['enforce-failover'] ?? process.env.OPS_GATE_ENFORCE_FAILOVER,
    isProduction
  );
  const enforceBackup = parseBoolean(
    args['enforce-backup'] ?? process.env.OPS_GATE_ENFORCE_BACKUP,
    isProduction
  );
  const maxAgeHours = parsePositiveInt(
    args['backup-max-age-hours'] || process.env.BACKUP_EVIDENCE_MAX_AGE_HOURS || '24',
    24
  );
  const evidenceDir = path.resolve(
    rootDir,
    args['backup-evidence-dir'] || process.env.BACKUP_EVIDENCE_DIR || path.join('server', 'backups', 'evidence')
  );
  const allowSyntheticEvidence = parseBoolean(
    args['allow-synthetic-backup-evidence'] ?? process.env.ALLOW_SYNTHETIC_BACKUP_EVIDENCE,
    false
  );
  const requireRestorePass = parseBoolean(
    args['backup-require-restore-pass'] ?? process.env.BACKUP_EVIDENCE_REQUIRE_RESTORE_PASS,
    false
  );
  const skipBackupFileCheck = parseBoolean(
    args['skip-backup-file-check'] ?? process.env.BACKUP_EVIDENCE_SKIP_FILE_CHECK,
    false
  );
  const autoRefreshBackup = parseBoolean(
    args['auto-refresh-backup'] ?? process.env.OPS_GATE_AUTO_REFRESH_BACKUP,
    false
  );
  const refreshForce = parseBoolean(
    args['refresh-force'] ?? process.env.OPS_GATE_BACKUP_REFRESH_FORCE,
    false
  );
  const refreshRestoreDrill = parseBoolean(
    args['refresh-restore-drill'] ?? process.env.OPS_GATE_BACKUP_REFRESH_RESTORE_DRILL,
    false
  );

  const dependencyGateResult = runNpm(serverDir, ['run', 'failover:active-active:dependency-gate:skip-probe']);
  if (dependencyGateResult.error) {
    console.error(`[ops-gate] dependency gate process error: ${dependencyGateResult.error.message}`);
    process.exit(1);
  }

  const dependencyStatus = parseOutputValue(
    `${dependencyGateResult.stdout || ''}\n${dependencyGateResult.stderr || ''}`,
    'ACTIVE_ACTIVE_DEPENDENCY_STATUS'
  ) || 'UNKNOWN';

  let backupRefreshResult = {
    attempted: false,
    ok: false,
    reason: null,
    exitCode: null
  };

  let backupEvidence = evaluateBackupEvidence({
    evidenceDir,
    maxAgeHours,
    allowSyntheticEvidence,
    requireRestorePass,
    skipBackupFileCheck
  });

  if (autoRefreshBackup && backupEvidence.status !== 'ok') {
    backupRefreshResult = refreshBackupEvidence({
      maxAgeHours,
      force: refreshForce,
      restoreDrill: refreshRestoreDrill
    });

    backupEvidence = evaluateBackupEvidence({
      evidenceDir,
      maxAgeHours,
      allowSyntheticEvidence,
      requireRestorePass,
      skipBackupFileCheck
    });
  }

  const dependencyOk = dependencyStatus === 'COMPLETE';
  const backupOk = backupEvidence.status === 'ok';
  const strictFailure = strict && (
    (enforceFailover && !dependencyOk) ||
    (enforceBackup && !backupOk)
  );

  console.log(`[ops-gate] strict=${strict}`);
  console.log(`[ops-gate] enforce_failover=${enforceFailover}`);
  console.log(`[ops-gate] enforce_backup=${enforceBackup}`);
  console.log(`[ops-gate] dependency_status=${dependencyStatus}`);
  console.log(`[ops-gate] backup_status=${backupEvidence.status}`);
  console.log(`[ops-gate] backup_refresh_attempted=${backupRefreshResult.attempted}`);
  if (backupRefreshResult.attempted) {
    console.log(`[ops-gate] backup_refresh_ok=${backupRefreshResult.ok}`);
    if (backupRefreshResult.reason) {
      console.log(`[ops-gate] backup_refresh_reason=${backupRefreshResult.reason}`);
    }
  }

  if (backupEvidence.newestFile) {
    console.log(`[ops-gate] backup_newest=${backupEvidence.newestFile}`);
    console.log(`[ops-gate] backup_age_hours=${backupEvidence.ageHours}`);
  }
  if (backupEvidence.backupFile) {
    console.log(`[ops-gate] backup_file=${backupEvidence.backupFile}`);
  }
  if (backupEvidence.backupSizeBytes !== undefined) {
    console.log(`[ops-gate] backup_size_bytes=${backupEvidence.backupSizeBytes}`);
  }
  if (backupEvidence.restoreHealth) {
    console.log(`[ops-gate] backup_restore_health=${backupEvidence.restoreHealth}`);
  }
  if (backupEvidence.timestampUtc) {
    console.log(`[ops-gate] backup_timestamp_utc=${backupEvidence.timestampUtc}`);
  }
  if (backupEvidence.reason) {
    console.log(`[ops-gate] backup_reason=${backupEvidence.reason}`);
  }

  if (!dependencyOk) {
    const message = '[ops-gate] failover dependency gate is not COMPLETE.';
    if (strict && enforceFailover) {
      console.error(message);
    } else if (strict && !enforceFailover) {
      console.warn(`${message} (not enforced in current policy)`);
    } else {
      console.warn(message);
    }
  }

  if (!backupOk) {
    const message = `[ops-gate] backup evidence check failed: ${backupEvidence.reason}`;
    if (strict && enforceBackup) {
      console.error(message);
    } else if (strict && !enforceBackup) {
      console.warn(`${message} (not enforced in current policy)`);
    } else {
      console.warn(message);
    }
  }

  if (strictFailure) {
    process.exit(1);
  }
}

main();
