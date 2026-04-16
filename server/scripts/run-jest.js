#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const jestBin = require.resolve('jest/bin/jest');
const jestArgs = process.argv.slice(2);

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'test',
  DOTENV_CONFIG_QUIET: process.env.DOTENV_CONFIG_QUIET || 'true'
};

const result = spawnSync(process.execPath, [jestBin, ...jestArgs], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to run Jest:', result.error.message);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
