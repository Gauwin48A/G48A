import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://127.0.0.1:8081";
const OUT = join(process.cwd(), "screenshots");
mkdirSync(OUT, { recursive: true });
const FAKE_LOCATION = JSON.stringify({
  latitude: 17.4449,
  longitude: 78.3489,
  accuracy: 20,
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  area: "Bachupally",
  provider: "gps",
  timestamp: Date.now(),
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    geolocation: { latitude: 17.4449, longitude: 78.3489 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.addInitScript(({ loc }) => {
    localStorage.setItem("mhub_location", loc);
    localStorage.setItem("mhub-theme", "light");
  }, { loc: FAKE_LOCATION });

  await page.goto(`${BASE}/post/629`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2500);

  const skipBtn = page.locator('button:has-text("Skip")');
  if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, "post-629-desktop.png"), fullPage: true });

  // Mobile shot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "post-629-mobile.png"), fullPage: true });

  await context.close();
  await browser.close();
  console.log("OK screenshots captured");
})();
