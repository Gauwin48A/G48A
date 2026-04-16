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
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    geolocation: { latitude: 17.4449, longitude: 78.3489 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.addInitScript(({ loc }) => {
    localStorage.setItem("mhub_location", loc);
    localStorage.setItem("mhub-theme", "light");
  }, { loc: FAKE_LOCATION });
  await page.goto(`${BASE}/post/629`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2000);
  const css = await page.evaluate(() => {
    const el = document.querySelector('.mhub-post-body');
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      gridTemplateAreas: style.gridTemplateAreas,
      gridAutoFlow: style.gridAutoFlow,
      gap: style.gap,
    };
  });
  console.log(css);
  await context.close();
  await browser.close();
})();
