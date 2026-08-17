const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'client', 'src');
const enPath = path.join(srcRoot, 'locales', 'en.json');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function flattenKeys(obj, prefix = '', out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, full, out);
    } else {
      out.add(full);
    }
  }
  return out;
}

function setKey(obj, key, value) {
  if (!key) return;
  if (key.includes('${')) return;
  obj[key] = value;
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = flattenKeys(en);

const files = walk(srcRoot);

const fallbackMap = new Map();

const tDefaultRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1\s*,\s*\{[\s\S]*?defaultValue\s*:\s*(['"`])([^'"`\n]+?)\3/gi;
const tDefaultStringRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1\s*,\s*(['"`])([^'"`\n]+?)\3/gi;
const tFallbackRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1\s*\)\s*(\|\||\?\?)\s*(['"`])([^'"`\n]+?)\4/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  let match;
  while ((match = tDefaultRegex.exec(content))) {
    const key = match[2];
    const def = match[4];
    if (!fallbackMap.has(key) && !key.includes('${')) {
      fallbackMap.set(key, def);
    }
  }

  while ((match = tDefaultStringRegex.exec(content))) {
    const key = match[2];
    const def = match[4];
    if (!fallbackMap.has(key) && !key.includes('${')) {
      fallbackMap.set(key, def);
    }
  }

  while ((match = tFallbackRegex.exec(content))) {
    const key = match[2];
    const fallback = match[5];
    if (!fallbackMap.has(key) && !key.includes('${')) {
      fallbackMap.set(key, fallback);
    }
  }
}

let added = 0;
const addedKeys = [];
for (const [key, fallback] of fallbackMap.entries()) {
  if (!enKeys.has(key)) {
    setKey(en, key, fallback);
    added += 1;
    addedKeys.push(key);
  }
}

if (added > 0) {
  const sorted = Object.keys(en).sort((a, b) => a.localeCompare(b));
  const reordered = {};
  for (const k of sorted) reordered[k] = en[k];
  fs.writeFileSync(enPath, JSON.stringify(reordered, null, 2) + '\n');
}

console.log(JSON.stringify({ added, addedKeys: addedKeys.sort() }, null, 2));
