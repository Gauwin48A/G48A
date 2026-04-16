import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://127.0.0.1:8081';
const OUT_BASE = join(process.cwd(), '..', 'screenshots');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = join(OUT_BASE, `darkmode-qa-${stamp}`);
mkdirSync(OUT_DIR, { recursive: true });

const LOGIN_PHONE = process.env.LOGIN_PHONE || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';

const FAKE_LOCATION = JSON.stringify({
  latitude: 17.4449,
  longitude: 78.3489,
  accuracy: 20,
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  area: 'Bachupally',
  provider: 'gps',
  timestamp: Date.now(),
});

function uniqueNameFactory() {
  const used = new Map();
  return (raw) => {
    const safe = raw
      .replace(/^\//, '')
      .replace(/[:?&#=]/g, '-')
      .replace(/\//g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'root';
    const count = used.get(safe) || 0;
    used.set(safe, count + 1);
    return count === 0 ? safe : `${safe}-${count + 1}`;
  };
}

function fillDynamic(path) {
  const map = {
    id: '123',
    postId: '123',
    userId: '123',
    code: 'demo',
    token: 'demo',
    slug: 'demo',
  };
  return path.replace(/:([^/]+)/g, (_, key) => map[key] || 'demo');
}

async function loginIfConfigured(page) {
  if (!LOGIN_PHONE || !LOGIN_PASSWORD) return { attempted: false, ok: false };
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    await page.fill('#mobile', LOGIN_PHONE);
    await page.fill('#password', LOGIN_PASSWORD);

    const submit = page.locator('button[type="submit"]');
    if (await submit.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse((resp) => resp.url().includes('/api/auth/login')).catch(() => null),
        submit.click(),
      ]);
    }

    try {
      await page.waitForFunction(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        return Boolean(token);
      }, { timeout: 15000 });
      return { attempted: true, ok: true };
    } catch {
      console.log('WARN login token not detected; continuing as guest');
      return { attempted: true, ok: false };
    }
  } catch (err) {
    console.log(`WARN login failed: ${String(err?.message || err).slice(0, 120)}`);
    return { attempted: true, ok: false };
  }
}

function extractRoutes() {
  const appPath = join(process.cwd(), 'src', 'App.jsx');
  const text = readFileSync(appPath, 'utf8');
  const routeRegex = /path="([^"]+)"/g;
  const paths = new Set();
  let m;
  while ((m = routeRegex.exec(text)) !== null) {
    const p = m[1];
    if (!p || p === '*') continue;
    paths.add(p);
  }
  return Array.from(paths);
}

(async () => {
  const rawRoutes = extractRoutes();
  const nameFor = uniqueNameFactory();
  const routes = rawRoutes.map((p) => {
    const filled = fillDynamic(p);
    return { path: filled, name: nameFor(p) };
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    geolocation: { latitude: 17.4449, longitude: 78.3489 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();

  await page.addInitScript(({ m, loc }) => {
    localStorage.setItem('mhub-theme', m);
    localStorage.setItem('mhub_location', loc);
    if (m === 'dark') document.documentElement.classList.add('dark');
  }, { m: 'dark', loc: FAKE_LOCATION });

  const loginResult = await loginIfConfigured(page);

  const report = {
    base: BASE,
    outDir: OUT_DIR,
    login: loginResult,
    routes: [],
  };

  for (const route of routes) {
    const url = `${BASE}${route.path}`;
    const item = { path: route.path, name: route.name, url, status: 'ok' };
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(4000);
      const skipBtn = page.locator('button:has-text("Skip")');
      if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(1500);
      }
      const fileName = `${route.name}-dark.png`;
      await page.screenshot({ path: join(OUT_DIR, fileName), fullPage: true });
      item.file = fileName;
      console.log(`OK ${route.path} -> ${fileName}`);
    } catch (err) {
      item.status = 'fail';
      item.error = String(err?.message || err).slice(0, 200);
      console.log(`FAIL ${route.path}: ${item.error}`);
    }
    report.routes.push(item);
  }

  await context.close();
  await browser.close();
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Done!');
})();
