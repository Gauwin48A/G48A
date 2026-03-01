#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isAggressive = process.argv.includes('--aggressive');
const withInstall = process.argv.includes('--with-install');

function runStep(label, npmArgs) {
  console.log(`\n[Optimize] ${label}`);
  try {
    const command = [npmCommand, ...npmArgs].join(' ');
    execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
  } catch (error) {
    const details = error?.message ? ` (${error.message})` : '';
    throw new Error(`Step failed: ${label}${details}`);
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
