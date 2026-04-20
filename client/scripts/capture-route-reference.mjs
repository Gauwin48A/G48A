import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const appPath = path.resolve('src/App.jsx');
const appSource = await fs.readFile(appPath, 'utf8');

const routeRegex = /<Route\s+path="([^"]+)"/g;
const routes = [];
let match;
while ((match = routeRegex.exec(appSource)) !== null) {
  const p = match[1];
  if (!p || p === '*') continue;
  routes.push(p);
}

const uniqueRoutes = [...new Set(routes)];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve('..', 'android-native', 'test-screenshots', `web-reference-${stamp}`);
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'en-US',
});
const page = await context.newPage();

const results = [];

function sanitizeRoute(route) {
  return route
    .replace(/:postId|:userId|:token|:code|:id/g, 'demo')
    .replace(/\*/g, '')
    .replace(/\/+/g, '/') || '/';
}

function fileSlug(route) {
  return route
    .replace(/^\//, '')
    .replace(/[:/?&=]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '') || 'root';
}

for (let i = 0; i < uniqueRoutes.length; i += 1) {
  const original = uniqueRoutes[i];
  const resolved = sanitizeRoute(original);
  const url = `http://localhost:8081${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
  const fileName = `${String(i + 1).padStart(2, '0')}_${fileSlug(original)}.png`;
  const target = path.join(outDir, fileName);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: target, fullPage: true });
    results.push({ route: original, resolved, url, file: fileName, status: 'ok' });
    // eslint-disable-next-line no-console
    console.log(`OK ${original} -> ${fileName}`);
  } catch (error) {
    results.push({
      route: original,
      resolved,
      url,
      file: fileName,
      status: 'error',
      error: String(error?.message || error),
    });
    // eslint-disable-next-line no-console
    console.error(`ERR ${original}: ${String(error?.message || error)}`);
  }
}

await browser.close();

await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(results, null, 2));
await fs.writeFile(
  path.join(outDir, 'manifest.txt'),
  results.map((r) => `${r.status.toUpperCase()} ${r.route} -> ${r.file}`).join('\n'),
);

// eslint-disable-next-line no-console
console.log(`Reference capture complete: ${outDir}`);
