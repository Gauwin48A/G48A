const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath || null;
const npmCommand = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const toNpmArgs = (args) => (npmCli ? [npmCli, ...args] : args);

function npmStep(name, cwd, args) {
  return {
    name,
    command: npmCommand,
    cwd,
    args: toNpmArgs(args)
  };
}

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
    name: 'Workspace codebase line budget guard',
    command: process.execPath,
    cwd: rootDir,
    args: ['scripts/line-budget.js', '--mode=guard', '--threshold=50000']
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
  npmStep('Testcase catalog coverage gate', rootDir, ['run', 'check:testcase-catalog']),
  npmStep('Client localhost hardcode gate', path.join(rootDir, 'client'), ['run', 'check:no-hardcoded-localhost']),
  npmStep('Client lint', path.join(rootDir, 'client'), ['run', 'lint']),
  npmStep('Client network contract gate', path.join(rootDir, 'client'), ['run', 'check:network-contract']),
  ...(process.platform === 'win32'
    ? [
        {
          name: 'Client unit tests',
          command: 'powershell',
          cwd: path.join(rootDir, 'client'),
          args: ['-NoProfile', '-Command', 'npm run test']
        }
      ]
    : [npmStep('Client unit tests', path.join(rootDir, 'client'), ['run', 'test'])]),
  npmStep('Client production build', path.join(rootDir, 'client'), ['run', 'build']),
  npmStep('Client bundle budget gate', path.join(rootDir, 'client'), ['run', 'check:bundle-budget']),
  npmStep('Server route contract gate', path.join(rootDir, 'server'), ['run', 'check:route-contract']),
  npmStep('Server schema contract gate', path.join(rootDir, 'server'), ['run', 'check:schema-contract']),
  npmStep('Server runtime contract probe', path.join(rootDir, 'server'), ['run', 'check:runtime-contract']),
  npmStep('Server page-flow contract probe', path.join(rootDir, 'server'), ['run', 'check:page-flow-contract']),
  npmStep('Server test suite', path.join(rootDir, 'server'), ['test']),
  {
    name: 'Server syntax check',
    command: process.execPath,
    cwd: path.join(rootDir, 'server'),
    args: ['-c', 'src/index.js']
  }
];

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd,
    shell: false,
    windowsHide: true,
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
