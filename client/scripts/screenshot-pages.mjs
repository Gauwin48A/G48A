import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:8081";
const pages = [
  { name: "SavedSearches", path: "/saved-searches" },
  { name: "PaymentPage", path: "/payment" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Rewards", path: "/rewards" },
  { name: "Complaints", path: "/complaints" },
  { name: "Feedback", path: "/feedback" },
  { name: "PostDetail", path: "/post/1" },
  { name: "SaleUndone", path: "/sale-undone" },
  { name: "MyHome", path: "/my-home" },
  { name: "AddPost", path: "/add-post" },
  { name: "Notifications", path: "/notifications" },
  { name: "SecuritySettings", path: "/security" },
  { name: "TierSelection", path: "/tier-selection" },
  { name: "PolicyLayout_TnC", path: "/t&c" },
];

/** Audit function that runs inside the browser page */
function auditPage() {
  const issues = [];
  const all = document.querySelectorAll("*");
  let totalElements = 0;
  let textElements = 0;
  let missingDarkBg = 0;
  let missingDarkText = 0;
  let tinyText = 0;
  let overflowX = 0;
  let misaligned = 0;

  for (const el of all) {
    totalElements++;
    const cs = getComputedStyle(el);
    const classList = el.className || "";
    if (typeof classList !== "string") continue;

    // Check for text content
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim()) {
      textElements++;
      const fontSize = parseFloat(cs.fontSize);
      if (fontSize < 11) {
        tinyText++;
        issues.push({ type: "tiny-text", tag: el.tagName, text: el.textContent.trim().slice(0, 40), fontSize });
      }
    }

    // Check horizontal overflow
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.overflow !== "hidden" && cs.overflowX !== "hidden") {
      const diff = el.scrollWidth - el.clientWidth;
      if (diff > 10) {
        overflowX++;
        issues.push({ type: "overflow-x", tag: el.tagName, class: classList.slice(0, 80), diff });
      }
    }

    // Check bg-white / bg-gray without dark: variant
    if (/\b(bg-white|bg-gray-\d+|bg-slate-\d+)\b/.test(classList) && !/dark:bg-/.test(classList)) {
      missingDarkBg++;
    }
    if (/\b(text-gray-\d+|text-slate-\d+)\b/.test(classList) && !/dark:text-/.test(classList)) {
      missingDarkText++;
    }
  }

  // Check page-level body overflow
  if (document.body.scrollWidth > window.innerWidth + 5) {
    issues.push({ type: "body-overflow", scrollWidth: document.body.scrollWidth, viewportWidth: window.innerWidth });
  }

  // Check main content centering
  const main = document.querySelector("main") || document.querySelector("[class*='page-shell']");
  if (main) {
    const rect = main.getBoundingClientRect();
    const leftGap = rect.left;
    const rightGap = window.innerWidth - rect.right;
    if (Math.abs(leftGap - rightGap) > 20) {
      issues.push({ type: "content-not-centered", leftGap: Math.round(leftGap), rightGap: Math.round(rightGap) });
    }
  }

  return {
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 500),
    totalElements,
    textElements,
    missingDarkBg,
    missingDarkText,
    tinyText,
    overflowX,
    issueCount: issues.length,
    issues: issues.slice(0, 15),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Light mode pass
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    geolocation: { latitude: 17.385, longitude: 78.4867 },
    permissions: ["geolocation"],
  });

  for (const pg of pages) {
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.setItem("mhub_location_skipped", JSON.stringify({ skipped: true, timestamp: Date.now() }));
        localStorage.setItem("mhub_language", "en");
      });
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(4000);

      const audit = await page.evaluate(auditPage);
      await page.screenshot({ path: path.join(outDir, `${pg.name}.png`), fullPage: true });

      results.push({ page: pg.name, mode: "light", ...audit });
      console.log(`OK  ${pg.name} (light) — ${audit.issueCount} issues, darkBg:${audit.missingDarkBg}, darkText:${audit.missingDarkText}, tinyText:${audit.tinyText}, overflow:${audit.overflowX}`);
    } catch (err) {
      console.log(`ERR ${pg.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  // Dark mode pass
  const darkContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    geolocation: { latitude: 17.385, longitude: 78.4867 },
    permissions: ["geolocation"],
  });

  for (const pg of pages) {
    const page = await darkContext.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.setItem("mhub_location_skipped", JSON.stringify({ skipped: true, timestamp: Date.now() }));
        localStorage.setItem("mhub_language", "en");
      });
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(4000);

      const audit = await page.evaluate(auditPage);
      await page.screenshot({ path: path.join(outDir, `${pg.name}_dark.png`), fullPage: true });

      results.push({ page: pg.name, mode: "dark", ...audit });
      console.log(`OK  ${pg.name} (dark)  — ${audit.issueCount} issues`);
    } catch (err) {
      console.log(`ERR ${pg.name} (dark): ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Write full audit report
  const reportPath = path.join(outDir, "audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit report: ${reportPath}`);
  console.log(`Screenshots: ${outDir}`);
})();
