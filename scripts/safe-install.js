#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const target = process.argv[2];
if (!target || !['client', 'server'].includes(target)) {
  console.error('Usage: node scripts/safe-install.js <client|server> [--prod]');
  process.exit(1);
}

const isProd = process.argv.includes('--prod');

function runNpm(args) {
  const invocation = process.platform === 'win32'
    ? { command: 'cmd.exe', commandArgs: ['/d', '/s', '/c', 'npm', ...args] }
    : { command: 'npm', commandArgs: args };

  const result = spawnSync(invocation.command, invocation.commandArgs, {
    cwd: rootDir,
    shell: false,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

const ciArgs = ['ci', '--prefix', target, '--no-audit', '--no-fund'];
if (isProd) ciArgs.push('--omit=dev');

const ciResult = runNpm(ciArgs);
if (ciResult.status === 0) {
  process.exit(0);
}

const combinedOutput = `${ciResult.stdout || ''}\n${ciResult.stderr || ''}`;
const hasFileLockIssue = /(EPERM|EBUSY|EACCES)/i.test(combinedOutput);

if (!(process.platform === 'win32' && hasFileLockIssue)) {
  process.exit(ciResult.status || 1);
}

console.error(`\n[safe-install] npm ci hit a Windows file-lock issue for "${target}".`);
console.error('[safe-install] Retrying with npm install fallback...');
console.error('[safe-install] Tip: close running node processes/editors to avoid lock churn.');

const installArgs = ['install', '--prefix', target, '--no-audit', '--no-fund'];
if (isProd) installArgs.push('--omit=dev');

const installResult = runNpm(installArgs);
if (installResult.status === 0) {
  console.log('[safe-install] Fallback install succeeded.');
  process.exit(0);
}

process.exit(installResult.status || 1);
