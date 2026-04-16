import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcPath = path.join(rootDir, 'client', 'src', 'locales', 'en.json');
const publicPath = path.join(
  rootDir,
  'client',
  'public',
  'locales',
  'en',
  'translation.json',
);

const loadJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const src = loadJson(srcPath);
const pub = loadJson(publicPath);

const srcKeys = new Set(Object.keys(src));
const pubKeys = new Set(Object.keys(pub));

const missingInSrc = [...pubKeys].filter((key) => !srcKeys.has(key)).sort();
const missingInPub = [...srcKeys].filter((key) => !pubKeys.has(key)).sort();
const valueDiffs = [...srcKeys]
  .filter((key) => pubKeys.has(key))
  .filter((key) => src[key] !== pub[key])
  .sort();

const report = [];

if (missingInSrc.length > 0) {
  report.push(
    `Missing in client/src/locales/en.json (${missingInSrc.length}):\n` +
      missingInSrc.join('\n'),
  );
}

if (missingInPub.length > 0) {
  report.push(
    `Missing in client/public/locales/en/translation.json (${missingInPub.length}):\n` +
      missingInPub.join('\n'),
  );
}

if (valueDiffs.length > 0) {
  const details = valueDiffs
    .map((key) => `- ${key}: src="${src[key]}" pub="${pub[key]}"`)
    .join('\n');
  report.push(
    `Mismatched values (${valueDiffs.length}):\n${details}`,
  );
}

if (report.length > 0) {
  console.error('[locale-sync] Locale drift detected.');
  console.error(report.join('\n\n'));
  process.exit(1);
}

console.log('[locale-sync] OK: en.json matches translation.json');
