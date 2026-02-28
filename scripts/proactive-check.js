const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = 'npm';

const checks = [
  {
    name: 'Client localhost hardcode gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'client'),
    args: ['run', 'check:no-hardcoded-localhost']
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
    name: 'Server route contract gate',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:route-contract']
  },
  {
    name: 'Server runtime contract probe',
    command: npmCommand,
    cwd: path.join(rootDir, 'server'),
    args: ['run', 'check:runtime-contract']
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
    stdio: 'inherit',
    shell: useShell,
    env: process.env
  });

  if (result.error) {
    console.error(`\nUnable to run step: ${check.name}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nProactive check failed at step: ${check.name}`);
    process.exit(result.status || 1);
  }
}

console.log('\nAll proactive checks passed.');
