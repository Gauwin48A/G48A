import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'http://127.0.0.1:8081';
const OUT = join(process.cwd(), 'screenshots');
mkdirSync(OUT, { recursive: true });
const LOGIN_PHONE = process.env.LOGIN_PHONE || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';

const PAGES = [
  { name: '01-allposts-beauty', path: '/all-posts?category=Beauty' },
  { name: '02-allposts-home', path: '/all-posts' },
  { name: '03-foryou', path: '/for-you' },
  { name: '04-feed', path: '/feed' },
  { name: '05-categories', path: '/categories' },
  { name: '06-search', path: '/search' },
  { name: '07-login', path: '/login' },
  { name: '08-signup', path: '/signup' },
  { name: '09-rewards', path: '/rewards' },
  { name: '10-profile', path: '/profile' },
  { name: '11-tierselection', path: '/tier-selection' },
  { name: '12-notifications', path: '/notifications' },
  { name: '13-dashboard', path: '/dashboard' },
  { name: '14-feedback', path: '/feedback' },
  { name: '15-complaints', path: '/complaints' },
  { name: '16-verification', path: '/verification' },
  { name: '17-offers', path: '/offers' },
  { name: '18-channels', path: '/channels' },
  { name: '19-nearby', path: '/nearby' },
  { name: '20-cart', path: '/cart' },
  { name: '21-wishlist', path: '/wishlist' },
  { name: '22-categorymode', path: '/category-mode' },
];
const ONLY_PAGES = process.env.ONLY_PAGES
  ? new Set(
      String(process.env.ONLY_PAGES)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    )
  : null;
const RUN_PAGES = ONLY_PAGES
  ? PAGES.filter((pg) => ONLY_PAGES.has(pg.name) || ONLY_PAGES.has(pg.path))
  : PAGES;

const FAKE_LOCATION = JSON.stringify({
  latitude: 17.4449, longitude: 78.3489, accuracy: 20,
  city: 'Hyderabad', state: 'Telangana', country: 'India',
  area: 'Bachupally', provider: 'gps', timestamp: Date.now()
});

async function loginIfConfigured(page) {
  if (!LOGIN_PHONE || !LOGIN_PASSWORD) return;
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
    } catch {
      console.log('WARN login token not detected; continuing as guest');
    }
  } catch (err) {
    console.log(`WARN login failed: ${String(err?.message || err).slice(0, 120)}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const mode of ['dark']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      geolocation: { latitude: 17.4449, longitude: 78.3489 },
      permissions: ['geolocation'],
    });
    const page = await context.newPage();

    // Seed localStorage before any navigation
    await page.addInitScript(({ m, loc }) => {
      localStorage.setItem('mhub-theme', m);
      localStorage.setItem('mhub_location', loc);
      if (m === 'dark') document.documentElement.classList.add('dark');
    }, { m: mode, loc: FAKE_LOCATION });

    await loginIfConfigured(page);

    for (const pg of RUN_PAGES) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(4000); // Wait for LocationGate auto-bypass + render
        // Click skip if present
        const skipBtn = page.locator('button:has-text("Skip")');
        if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await skipBtn.click();
          await page.waitForTimeout(1500);
        }
        await page.screenshot({ path: join(OUT, `${pg.name}-${mode}.png`), fullPage: true });
        console.log(`OK ${pg.name}-${mode}`);
      } catch (e) {
        console.log(`FAIL ${pg.name}-${mode}: ${e.message.slice(0, 100)}`);
      }
    }
    await context.close();
  }
  await browser.close();
  console.log('Done!');
})();
