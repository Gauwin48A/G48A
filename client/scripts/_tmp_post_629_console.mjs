import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8081";
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

  page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE', msg.text());
  });

  await page.addInitScript(({ loc }) => {
    localStorage.setItem("mhub_location", loc);
    localStorage.setItem("mhub-theme", "light");
  }, { loc: FAKE_LOCATION });

  await page.goto(`${BASE}/post/629`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(3000);
  await context.close();
  await browser.close();
})();
