import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';

const distDir = path.resolve(process.cwd(), 'dist');
const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
const distHtmlPath = path.resolve(process.cwd(), 'dist', 'index.html');

const budgets = {
  entryJsGzipKb: Number.parseInt(process.env.BUNDLE_BUDGET_ENTRY_JS_GZIP_KB || '170', 10),
  entryCssGzipKb: Number.parseInt(process.env.BUNDLE_BUDGET_ENTRY_CSS_GZIP_KB || '25', 10),
  entryJsRawKb: Number.parseInt(process.env.BUNDLE_BUDGET_ENTRY_JS_RAW_KB || '550', 10),
  entryCssRawKb: Number.parseInt(process.env.BUNDLE_BUDGET_ENTRY_CSS_RAW_KB || '180', 10),
  bootstrapJsGzipKb: Number.parseInt(process.env.BUNDLE_BUDGET_BOOTSTRAP_JS_GZIP_KB || '150', 10),
  bootstrapJsRawKb: Number.parseInt(process.env.BUNDLE_BUDGET_BOOTSTRAP_JS_RAW_KB || '420', 10)
};

function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function fail(message) {
  console.error(`[bundle-budget] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(distAssetsDir)) {
  fail(`Build output not found at ${distAssetsDir}. Run "npm run build" first.`);
}
if (!fs.existsSync(distHtmlPath)) {
  fail(`Build output not found at ${distHtmlPath}. Run "npm run build" first.`);
}

const assetFiles = fs.readdirSync(distAssetsDir);

function pickLargestAsset(matcher) {
  const candidates = assetFiles.filter((file) => matcher.test(file));
  if (!candidates.length) {
    return null;
  }

  let best = candidates[0];
  let bestSize = fs.statSync(path.join(distAssetsDir, best)).size;
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const size = fs.statSync(path.join(distAssetsDir, candidate)).size;
    if (size > bestSize) {
      best = candidate;
      bestSize = size;
    }
  }
  return best;
}

const entryJsFile = pickLargestAsset(/^index-.*\.js$/);
const entryCssFile = pickLargestAsset(/^index-.*\.css$/);

if (!entryJsFile || !entryCssFile) {
  fail('Could not locate entry JS/CSS assets in dist/assets.');
}

function readAssetMetrics(fileName) {
  const absolutePath = path.join(distAssetsDir, fileName);
  const content = fs.readFileSync(absolutePath);
  return {
    fileName,
    rawBytes: content.length,
    gzipBytes: gzipSync(content).length
  };
}

const jsMetrics = readAssetMetrics(entryJsFile);
const cssMetrics = readAssetMetrics(entryCssFile);

function parseBootstrapAssetFileNames(indexHtmlText) {
  const candidates = new Set();
  const assetPathPattern = /(?:src|href)="([^"]+)"/g;
  let match = null;

  while ((match = assetPathPattern.exec(indexHtmlText)) !== null) {
    const value = String(match[1] || '');
    if (!value.includes('/assets/')) {
      continue;
    }
    if (!value.endsWith('.js')) {
      continue;
    }

    const assetName = value.split('/assets/')[1]?.split('?')[0]?.trim();
    if (!assetName) {
      continue;
    }
    candidates.add(assetName);
  }

  return [...candidates].filter((fileName) => fs.existsSync(path.join(distAssetsDir, fileName)));
}

function aggregateAssetMetrics(fileNames = []) {
  return fileNames.reduce(
    (summary, fileName) => {
      const metrics = readAssetMetrics(fileName);
      summary.rawBytes += metrics.rawBytes;
      summary.gzipBytes += metrics.gzipBytes;
      return summary;
    },
    { rawBytes: 0, gzipBytes: 0 }
  );
}

const indexHtmlText = fs.readFileSync(distHtmlPath, 'utf8');
const bootstrapJsFiles = parseBootstrapAssetFileNames(indexHtmlText);
const bootstrapJsMetrics = aggregateAssetMetrics(bootstrapJsFiles);

const checks = [
  {
    label: 'entry JS gzip',
    actual: bytesToKb(jsMetrics.gzipBytes),
    budget: budgets.entryJsGzipKb,
    unit: 'KB'
  },
  {
    label: 'entry CSS gzip',
    actual: bytesToKb(cssMetrics.gzipBytes),
    budget: budgets.entryCssGzipKb,
    unit: 'KB'
  },
  {
    label: 'entry JS raw',
    actual: bytesToKb(jsMetrics.rawBytes),
    budget: budgets.entryJsRawKb,
    unit: 'KB'
  },
  {
    label: 'entry CSS raw',
    actual: bytesToKb(cssMetrics.rawBytes),
    budget: budgets.entryCssRawKb,
    unit: 'KB'
  },
  {
    label: 'bootstrap JS gzip',
    actual: bytesToKb(bootstrapJsMetrics.gzipBytes),
    budget: budgets.bootstrapJsGzipKb,
    unit: 'KB'
  },
  {
    label: 'bootstrap JS raw',
    actual: bytesToKb(bootstrapJsMetrics.rawBytes),
    budget: budgets.bootstrapJsRawKb,
    unit: 'KB'
  }
];

console.log('[bundle-budget] Checked assets:');
console.log(`  JS  -> ${jsMetrics.fileName}`);
console.log(`  CSS -> ${cssMetrics.fileName}`);
console.log(`  Bootstrap JS assets (${bootstrapJsFiles.length}) -> ${bootstrapJsFiles.join(', ')}`);

let failed = false;
for (const check of checks) {
  const status = check.actual <= check.budget ? 'PASS' : 'FAIL';
  const line = `${status} | ${check.label}: ${check.actual}${check.unit} (budget ${check.budget}${check.unit})`;
  if (status === 'FAIL') {
    failed = true;
    console.error(`[bundle-budget] ${line}`);
  } else {
    console.log(`[bundle-budget] ${line}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('[bundle-budget] All bundle budget checks passed.');
