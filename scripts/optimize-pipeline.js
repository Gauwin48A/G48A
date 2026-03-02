#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isAggressive = process.argv.includes('--aggressive');
const withInstall = process.argv.includes('--with-install');

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

function runStep(label, npmArgs) {
  console.log(`\n[Optimize] ${label}`);
  const invocation = resolveNpmInvocation(npmArgs);
  const result = spawnSync(invocation.command, invocation.commandArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env: process.env
  });

  if (result.error) {
    throw new Error(`Step failed: ${label} (${result.error.message})`);
  }

  if (result.status !== 0) {
    throw new Error(`Step failed: ${label} (exit code ${result.status || 1})`);
  }
}

try {
  runStep('Baseline footprint report', ['run', 'footprint:report']);
  runStep('Locale normalization/minification', ['run', 'optimize:locales']);
  runStep(
    isAggressive ? 'Aggressive footprint cleanup' : 'Standard footprint cleanup',
    ['run', isAggressive ? 'optimize:footprint:aggressive' : 'optimize:footprint']
  );

  if (withInstall) {
    runStep('Reinstall dependencies', ['run', 'install:all']);
    runStep('Dependency dedupe', ['run', 'dedupe:all']);
  }

  runStep('Locale integrity validation', ['run', 'validate:locales']);
  runStep('Footprint guard (present-files mode)', ['run', 'footprint:guard']);
  runStep('Tracked dependencies guard', ['run', 'footprint:guard:tracked-deps']);
  runStep('Final footprint report', ['run', 'footprint:report']);

  console.log('\n[Optimize] Pipeline completed successfully.');
} catch (error) {
  console.error(`\n[Optimize] Pipeline failed: ${error.message}`);
  process.exit(1);
}
