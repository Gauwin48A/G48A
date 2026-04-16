#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, "../../..");

const requiredRootEntries = ['client', 'server', 'package.json', 'README.md'];

const allowedRootEntries = new Set([
  '.github',
  'client',
  'server',
  'README.md',
  'PROJECT_STRUCTURE.md',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.editorconfig',
  '.env',
  '.env.example',
  '.env.local',
  '.env.development',
  '.env.production'
]);

const ignoredEphemeralEntries = new Set([
  '.git',
  'node_modules'
]);

function listRootEntries() {
  return fs.readdirSync(rootDir, { withFileTypes: true }).map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory()
  }));
}

function main() {
  const entries = listRootEntries();
  const names = new Set(entries.map((entry) => entry.name));

  const missingRequired = requiredRootEntries.filter((name) => !names.has(name));
  const unexpected = entries
    .filter((entry) => !ignoredEphemeralEntries.has(entry.name))
    .filter((entry) => !allowedRootEntries.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory ? 'dir' : 'file'
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (missingRequired.length === 0 && unexpected.length === 0) {
    console.log('Repository structure check passed.');
    console.log(
      `Root contains only allowed entries (excluding ephemeral .git/node_modules) at ${path.relative(
        process.cwd(),
        rootDir
      ) || '.'}`
    );
    process.exit(0);
  }

  console.error('Repository structure check failed.');

  if (missingRequired.length > 0) {
    console.error('- Missing required root entries:');
    for (const name of missingRequired) {
      console.error(`  - ${name}`);
    }
  }

  if (unexpected.length > 0) {
    console.error('- Unexpected root entries (move under client/ or server/):');
    for (const entry of unexpected) {
      console.error(`  - ${entry.type}: ${entry.name}`);
    }
  }

  process.exit(1);
}

main();

