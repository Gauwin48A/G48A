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
  const dims = await page.evaluate(() => {
    const rect = (el) => el ? el.getBoundingClientRect() : null;
    return {
      innerWidth: window.innerWidth,
      body: rect(document.querySelector('.mhub-post-body')),
      media: rect(document.querySelector('.mhub-post-media')),
      rail: rect(document.querySelector('.mhub-post-rail')),
      main: rect(document.querySelector('.mhub-post-main')),
    };
  });
  console.log(JSON.stringify(dims, null, 2));
  await context.close();
  await browser.close();
})();
