#!/usr/bin/env node

const { spawnSync } = require('child_process');

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
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

function probeExecutable(commandName) {
  const probeCommand = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(probeCommand, [commandName], {
    shell: false,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.error) {
    return {
      available: false,
      location: null
    };
  }

  if (result.status !== 0) {
    return {
      available: false,
      location: null
    };
  }

  const location = String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || null;

  return {
    available: Boolean(location),
    location
  };
}

function printGuidance() {
  console.log('[backup-toolchain] Install guidance:');
  if (process.platform === 'win32') {
    console.log('- Install PostgreSQL client tools and add its "bin" directory to PATH.');
    console.log('- Typical location: C:\\Program Files\\PostgreSQL\\<version>\\bin');
  } else if (process.platform === 'darwin') {
    console.log('- Install PostgreSQL client tools (for example: brew install libpq).');
    console.log('- Ensure PATH includes libpq bin tools.');
  } else {
    console.log('- Install PostgreSQL client tools (for example: apt/yum install postgresql-client).');
    console.log('- Ensure PATH includes pg_dump/psql/pg_restore.');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = parseBoolean(args.strict, false);
  const requireRestoreTools = parseBoolean(args['require-restore-tools'], false);

  const requiredTools = ['pg_dump'];
  if (requireRestoreTools) {
    requiredTools.push('psql', 'pg_restore');
  }

  const missing = [];
  for (const tool of requiredTools) {
    const probe = probeExecutable(tool);
    if (probe.available) {
      console.log(`OK   ${tool} available (${probe.location})`);
    } else {
      console.log(`WARN ${tool} not found in PATH`);
      missing.push(tool);
    }
  }

  const status = missing.length ? 'MISSING' : 'COMPLETE';
  console.log(`BACKUP_TOOLCHAIN_STATUS=${status}`);
  if (missing.length) {
    console.log(`BACKUP_TOOLCHAIN_MISSING=${missing.join(',')}`);
    printGuidance();
    if (strict) {
      process.exit(1);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`[backup-toolchain] check failed: ${error.message}`);
  process.exit(1);
}
