const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = 'npm';

const checks = [
  {
    name: 'Workspace tracked dependency guard',
    command: process.execPath,
    cwd: rootDir,
    args: ['scripts/guard-tracked-deps.js']
  },
  {
    name: 'Workspace footprint guard',
    command: process.execPath,
    cwd: rootDir,
    args: ['scripts/guard-footprint.js']
  },
  {
    name: 'Workspace locale validation',
    command: process.execPath,
    cwd: rootDir,
    args: ['scripts/validate-locales.js']
  },
  {
    name: 'Proactive workflow contract gate',
    command: process.execPath,
    cwd: rootDir,
    args: ['scripts/check-proactive-workflow-contract.js']
  },
  {
    name: 'Client localhost hardcode gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'check:no-hardcoded-localhost']
  },
  {
    name: 'Client lint',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'lint']
  },
  {
    name: 'Client network contract gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'check:network-contract']
  },
  {
    name: 'Client unit tests',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'test']
  },
  {
    name: 'Client production build',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'build']
  },
  {
    name: 'Client bundle budget gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'check:bundle-budget']
  },
  {
    name: 'Server route contract gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:route-contract']
  },
  {
    name: 'Server schema contract gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:schema-contract']
  },
  {
    name: 'Server runtime contract probe',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:runtime-contract']
  },
  {
    name: 'Server page-flow contract probe',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:page-flow-contract']
  },
  {
    name: 'Server test suite',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['test', '--', '--runInBand']
  },
  {
    name: 'Server syntax check',
    command: process.execPath,
    cwd: path.join(rootDir, 'server'),
    args: ['-c', 'src/index.js']
  }
];

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const useShell = check.command === npmCommand;
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd,
    shell: useShell,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    console.error(`\nUnable to run step: ${check.name}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (
      process.platform === 'win32' &&
      /(EPERM|EBUSY|EACCES)/i.test(`${result.stdout || ''}\n${result.stderr || ''}`)
    ) {
      console.error('\nWindows file-lock detected (EPERM/EBUSY/EACCES).');
      console.error('Close running dev servers/watchers and retry the same command.');
    }
    console.error(`\nProactive check failed at step: ${check.name}`);
    process.exit(result.status || 1);
  }
}

console.log('\nAll proactive checks passed.');
