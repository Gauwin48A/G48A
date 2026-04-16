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

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = flattenKeys(en);

const files = walk(srcRoot);

const keyUsage = new Map();

function addUsage(key, file, defaultValue) {
  if (!key) return;
  if (key.includes('${')) return;
  const entry = keyUsage.get(key) || { files: new Set(), defaultValue: null };
  entry.files.add(file);
  if (!entry.defaultValue && defaultValue) {
    entry.defaultValue = defaultValue;
  }
  keyUsage.set(key, entry);
}

const tCallRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1/g;
const i18nKeyRegex = /i18nKey\s*=\s*(['"`])([^'"`\n]+?)\1/g;
const tDefaultRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1\s*,\s*\{[\s\S]*?defaultValue\s*:\s*(['"`])([^'"`\n]+?)\3/gi;
const tDefaultStringRegex = /\bt\s*\(\s*(['"`])([^'"`\n]+?)\1\s*,\s*(['"`])([^'"`\n]+?)\3/gi;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  let match;
  while ((match = tCallRegex.exec(content))) {
    const key = match[2];
    if (match[1] === '`' && key.includes('${')) continue;
    addUsage(key, file);
  }

  while ((match = i18nKeyRegex.exec(content))) {
    const key = match[2];
    addUsage(key, file);
  }

  while ((match = tDefaultRegex.exec(content))) {
    const key = match[2];
    const def = match[4];
    addUsage(key, file, def);
  }

  while ((match = tDefaultStringRegex.exec(content))) {
    const key = match[2];
    const def = match[4];
    addUsage(key, file, def);
  }
}

const missing = [];
for (const [key, meta] of keyUsage.entries()) {
  if (!enKeys.has(key)) {
    missing.push({
      key,
      defaultValue: meta.defaultValue || null,
      files: Array.from(meta.files).map((f) => path.relative(repoRoot, f))
    });
  }
}

missing.sort((a, b) => a.key.localeCompare(b.key));

const reportPath = path.join(repoRoot, 'client', 'i18n-missing-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalMissing: missing.length,
  missing
}, null, 2));

const summary = {
  totalMissing: missing.length,
  withDefault: missing.filter(m => m.defaultValue).length,
  withoutDefault: missing.filter(m => !m.defaultValue).length,
};
console.log(JSON.stringify(summary, null, 2));
