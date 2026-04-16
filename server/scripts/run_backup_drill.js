#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv is optional at runtime if env vars are already injected.
}

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseIntSafe(rawValue, fallback, { min = Number.NEGATIVE_INFINITY } = {}) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return fallback;
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

function formatTimestamp(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function sanitizeDatabaseIdentifier(value, label) {
  const candidate = String(value || '').trim();
  if (!/^[A-Za-z0-9_]+$/.test(candidate)) {
    throw new Error(`${label} contains unsupported characters. Allowed: letters, numbers, underscore.`);
  }
  return candidate;
}

function runCommand(command, args, env) {
  const result = spawnSync(command, args, {
    env,
    shell: false,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error(`Required executable not found in PATH: ${command}`);
    }
    throw new Error(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status || 1}`);
  }
}

function removeExpiredBackups(backupDir, retentionDays) {
  const cutoffMs = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const entries = fs.readdirSync(backupDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.dump')) continue;
    const filePath = path.join(backupDir, entry.name);
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoffMs) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Retention cleanup should not block drill completion.
    }
  }
}

function buildConfig(args, env) {
  const backupDirInput = args['backup-dir'] || env.BACKUP_DIR || 'backups';
  const backupDir = path.resolve(process.cwd(), backupDirInput);
  const retentionDays = parseIntSafe(
    args['retention-days'] || env.BACKUP_RETENTION_DAYS || '14',
    14,
    { min: 1 }
  );

  return {
    dbHost: args['db-host'] || env.DB_HOST || '',
    dbPort: String(args['db-port'] || env.DB_PORT || ''),
    dbName: args['db-name'] || env.DB_NAME || '',
    dbUser: args['db-user'] || env.DB_USER || '',
    dbPassword: args['db-password'] || env.DB_PASSWORD || '',
    backupDir,
    evidenceDir: path.join(backupDir, 'evidence'),
    drillDbName: args['drill-db-name'] || env.BACKUP_DRILL_DB_NAME || 'mhub_restore_drill',
    retentionDays,
    runRestoreDrill: parseBoolean(args['restore-drill'] ?? env.RUN_RESTORE_DRILL, false),
    dryRun: parseBoolean(args['dry-run'], false)
  };
}

function validateConfig(config) {
  if (!config.dbHost || !config.dbPort || !config.dbName || !config.dbUser) {
    throw new Error('Missing DB inputs. Required: DB_HOST, DB_PORT, DB_NAME, DB_USER.');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildConfig(args, process.env);

  fs.mkdirSync(config.backupDir, { recursive: true });
  fs.mkdirSync(config.evidenceDir, { recursive: true });

  if (config.dryRun) {
    console.log('[BACKUP] Dry-run mode enabled. No backup or restore command will be executed.');
    console.log(`BACKUP_DRILL_STATUS=DRY_RUN`);
    console.log(`BACKUP_DRILL_BACKUP_DIR=${config.backupDir}`);
    console.log(`BACKUP_DRILL_EVIDENCE_DIR=${config.evidenceDir}`);
    return;
  }

  validateConfig(config);

  const timestamp = formatTimestamp(new Date());
  const backupFile = path.join(
    config.backupDir,
    `mhub_${sanitizeDatabaseIdentifier(config.dbName, 'DB_NAME')}_${timestamp}.dump`
  );

  const commandEnv = {
    ...process.env,
    PGPASSWORD: config.dbPassword || process.env.PGPASSWORD || ''
  };

  let restoreExecuted = false;
  let restoreHealth = 'skipped';
  let restoreRowCheck = null;
  let restoreError = null;

  console.log(`[BACKUP] Starting backup for database "${config.dbName}" on ${config.dbHost}:${config.dbPort}`);
  runCommand('pg_dump', [
    '--host', config.dbHost,
    '--port', String(config.dbPort),
    '--username', config.dbUser,
    '--dbname', config.dbName,
    '--format=custom',
    '--file', backupFile
  ], commandEnv);

  const backupStats = fs.statSync(backupFile);
  const backupSizeBytes = backupStats.size;
  if (!Number.isFinite(backupSizeBytes) || backupSizeBytes <= 0) {
    throw new Error('Backup file was created but has invalid size.');
  }
  console.log(`[BACKUP] Backup created: ${backupFile} (${backupSizeBytes} bytes)`);

  if (config.runRestoreDrill) {
    restoreExecuted = true;
    const drillDbName = sanitizeDatabaseIdentifier(config.drillDbName, 'BACKUP_DRILL_DB_NAME');
    const quotedDrillDbName = `"${drillDbName}"`;
    try {
      console.log(`[RESTORE] Running restore drill into ${drillDbName}`);
      runCommand('psql', [
        '--host', config.dbHost,
        '--port', String(config.dbPort),
        '--username', config.dbUser,
        '--dbname', 'postgres',
        '--command', `DROP DATABASE IF EXISTS ${quotedDrillDbName};`
      ], commandEnv);

      runCommand('psql', [
        '--host', config.dbHost,
        '--port', String(config.dbPort),
        '--username', config.dbUser,
        '--dbname', 'postgres',
        '--command', `CREATE DATABASE ${quotedDrillDbName};`
      ], commandEnv);

      runCommand('pg_restore', [
        '--host', config.dbHost,
        '--port', String(config.dbPort),
        '--username', config.dbUser,
        '--dbname', drillDbName,
        '--clean',
        '--if-exists',
        backupFile
      ], commandEnv);

      const queryResult = spawnSync('psql', [
        '--host', config.dbHost,
        '--port', String(config.dbPort),
        '--username', config.dbUser,
        '--dbname', drillDbName,
        '--tuples-only',
        '--no-align',
        '--command', 'SELECT COUNT(*) FROM users;'
      ], {
        env: commandEnv,
        shell: false,
        encoding: 'utf8'
      });

      if (queryResult.stdout) process.stdout.write(queryResult.stdout);
      if (queryResult.stderr) process.stderr.write(queryResult.stderr);

      if (queryResult.error) {
        throw new Error(`psql verify query failed: ${queryResult.error.message}`);
      }
      if (queryResult.status !== 0) {
        throw new Error(`psql verify query exited with code ${queryResult.status || 1}`);
      }

      const firstLine = String(queryResult.stdout || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      restoreRowCheck = firstLine || '0';
      restoreHealth = 'passed';
      console.log(`[RESTORE] Drill passed. users_count=${restoreRowCheck}`);
    } catch (error) {
      restoreHealth = 'failed';
      restoreError = error.message;
      console.error(`[RESTORE] Drill failed: ${restoreError}`);
    }
  }

  removeExpiredBackups(config.backupDir, config.retentionDays);

  const evidence = {
    evidence_type: 'backup_drill',
    evidence_version: 1,
    generated_by: 'server/scripts/run_backup_drill.js',
    timestamp_utc: new Date().toISOString(),
    db_host: config.dbHost,
    db_port: config.dbPort,
    db_name: config.dbName,
    backup_file: backupFile,
    backup_size_bytes: backupSizeBytes,
    retention_days: config.retentionDays,
    restore_executed: restoreExecuted,
    restore_target_db: config.drillDbName,
    restore_health: restoreHealth,
    restore_row_check_users: restoreRowCheck,
    restore_error: restoreError,
    dry_run: false
  };

  const evidenceFile = path.join(config.evidenceDir, `backup_drill_${timestamp}.json`);
  fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  console.log(`[EVIDENCE] Drill evidence written to ${evidenceFile}`);
  console.log(`BACKUP_DRILL_EVIDENCE=${evidenceFile}`);
  console.log(`BACKUP_DRILL_STATUS=${restoreHealth === 'failed' ? 'FAILED' : 'COMPLETE'}`);

  if (restoreHealth === 'failed') {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`BACKUP_DRILL_ERROR=${error.message}`);
  process.exit(1);
}
