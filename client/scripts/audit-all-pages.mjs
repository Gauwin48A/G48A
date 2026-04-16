/**
 * Full-page audit: captures screenshots & detects UI issues for all public routes.
 * Usage: node scripts/audit-all-pages.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = path.resolve('audit-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

// All public + auth-gated routes to audit
const ROUTES = [
  // Public pages
  { path: '/', name: 'root-redirect' },
  { path: '/category-hub', name: 'category-hub' },
  { path: '/all-posts', name: 'all-posts' },
  { path: '/listings', name: 'listings' },
  { path: '/for-you', name: 'for-you' },
  { path: '/feed', name: 'feed' },
  { path: '/home', name: 'home' },
  { path: '/search', name: 'search' },
  { path: '/nearby', name: 'nearby' },
  { path: '/post/123', name: 'post-detail' },
  { path: '/listing/123', name: 'listing-detail' },
  { path: '/public-wall', name: 'public-wall' },
  { path: '/categories', name: 'categories' },
  { path: '/subcategories', name: 'subcategories' },
  // Auth pages
  { path: '/login', name: 'login' },
  { path: '/signup', name: 'signup' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/reset-password/demo', name: 'reset-password' },
  { path: '/invite/demo', name: 'invite-redirect' },
  // Auth-required (will show login redirect or skeleton)
  { path: '/profile', name: 'profile' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/add-post', name: 'add-post' },
  { path: '/sell', name: 'sell' },
  { path: '/my-home', name: 'my-home' },
  { path: '/cart', name: 'cart' },
  { path: '/wishlist', name: 'wishlist' },
  { path: '/chat', name: 'chat' },
  { path: '/notifications', name: 'notifications' },
  { path: '/rewards', name: 'rewards' },
  { path: '/activity', name: 'activity' },
  { path: '/analytics', name: 'analytics' },
  { path: '/feedback', name: 'feedback' },
  { path: '/complaints', name: 'complaints' },
  { path: '/security', name: 'security' },
  { path: '/tier-selection', name: 'tier-selection' },
  { path: '/pricing', name: 'pricing' },
  { path: '/centre', name: 'centre' },
  { path: '/verification', name: 'verification' },
  { path: '/admin-panel', name: 'admin-panel' },
  { path: '/privacy-policy', name: 'privacy-policy' },
  { path: '/terms', name: 'terms' },
  { path: '/refund-policy', name: 'refund-policy' },
  { path: '/compare', name: 'compare' },
  { path: '/recently-viewed', name: 'recently-viewed' },
  { path: '/saved-searches', name: 'saved-searches' },
  { path: '/bought-posts', name: 'bought-posts' },
  { path: '/sold-posts', name: 'sold-posts' },
  { path: '/offers', name: 'offers' },
  { path: '/reviews', name: 'reviews' },
  { path: '/post-welcome', name: 'post-welcome' },
  { path: '/not-found-test-404', name: '404-not-found' },
];

async function auditPage(page, route) {
  const issues = [];
  const consoleErrors = [];
  const networkErrors = [];

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().substring(0, 200));
    }
  });

  // Collect network failures
  page.on('requestfailed', req => {
    networkErrors.push({
      url: req.url().substring(0, 150),
      failure: req.failure()?.errorText || 'unknown',
    });
  });

  const url = `${BASE}${route.path}`;
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    if (!response) {
      issues.push({ type: 'NAVIGATION', severity: 'critical', detail: 'No response received' });
    } else if (response.status() >= 400) {
      issues.push({ type: 'HTTP_ERROR', severity: 'critical', detail: `Status ${response.status()}` });
    }
  } catch (err) {
    issues.push({ type: 'NAVIGATION', severity: 'critical', detail: err.message.substring(0, 200) });
  }

  // Wait for any lazy-loaded content
  await page.waitForTimeout(1500);

  // ─── UI checks ───

  // 1. Check for visible error boundaries / crash screens
  const errorBoundary = await page.$$('text=/something went wrong/i, text=/error/i, text=/crash/i');
  if (errorBoundary.length > 0) {
    for (const el of errorBoundary) {
      const text = await el.textContent();
      if (text && /something went wrong|unexpected error|app.*crash/i.test(text)) {
        issues.push({ type: 'ERROR_BOUNDARY', severity: 'critical', detail: text.substring(0, 100) });
      }
    }
  }

  // 2. Check for overflow issues (horizontal scroll)
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
  });
  if (hasHorizontalOverflow) {
    issues.push({ type: 'OVERFLOW', severity: 'high', detail: 'Page has horizontal overflow/scroll' });
  }

  // 3. Check for broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const broken = [];
    imgs.forEach(img => {
      if (img.naturalWidth === 0 && img.src && !img.src.includes('data:') && img.offsetParent !== null) {
        broken.push(img.src.substring(0, 120));
      }
    });
    return broken;
  });
  if (brokenImages.length > 0) {
    issues.push({ type: 'BROKEN_IMAGE', severity: 'medium', detail: `${brokenImages.length} broken: ${brokenImages.slice(0, 3).join(', ')}` });
  }

  // 4. Check for overlapping elements / z-index issues
  const overlaps = await page.evaluate(() => {
    const fixedEls = document.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"]');
    const problems = [];
    fixedEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.height > window.innerHeight * 0.5) {
        problems.push(`Fixed element covers ${Math.round(rect.height / window.innerHeight * 100)}% viewport`);
      }
    });
    return problems;
  });
  overlaps.forEach(o => issues.push({ type: 'OVERLAP', severity: 'medium', detail: o }));

  // 5. Check for missing dark mode classes (light bg in dark mode elements)
  const darkModeIssues = await page.evaluate(() => {
    const issues = [];
    const els = document.querySelectorAll('[class*="bg-white"], [class*="bg-gray-50"], [class*="bg-gray-100"]');
    els.forEach(el => {
      const classes = el.className;
      if (typeof classes === 'string' && !classes.includes('dark:')) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = classes.split(' ').filter(c => c.startsWith('bg-')).join(' ');
        if (cls) {
          issues.push(`${tag}${id} has ${cls} without dark: variant`);
        }
      }
    });
    return issues.slice(0, 10);
  });
  darkModeIssues.forEach(d => issues.push({ type: 'DARK_MODE', severity: 'medium', detail: d }));

  // 6. Check for empty/blank page
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim()?.length || 0);
  if (bodyText < 20) {
    issues.push({ type: 'BLANK_PAGE', severity: 'high', detail: `Page body has only ${bodyText} chars of text` });
  }

  // 7. Check for accessibility issues
  const a11yIssues = await page.evaluate(() => {
    const issues = [];
    // Buttons without labels
    const buttons = document.querySelectorAll('button');
    let unlabeledBtns = 0;
    buttons.forEach(btn => {
      if (!btn.textContent?.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title')) {
        unlabeledBtns++;
      }
    });
    if (unlabeledBtns > 0) issues.push(`${unlabeledBtns} buttons without accessible labels`);

    // Images without alt
    const imgs = document.querySelectorAll('img');
    let noAlt = 0;
    imgs.forEach(img => {
      if (!img.getAttribute('alt') && img.offsetParent !== null) noAlt++;
    });
    if (noAlt > 0) issues.push(`${noAlt} images without alt text`);

    // Low contrast text (basic check)
    const smallText = document.querySelectorAll('.text-gray-300, .text-gray-400, [class*="text-opacity"]');
    if (smallText.length > 5) issues.push(`${smallText.length} elements with potentially low contrast text`);

    return issues;
  });
  a11yIssues.forEach(a => issues.push({ type: 'A11Y', severity: 'medium', detail: a }));

  // 8. Check for clickable elements that aren't buttons or links  
  const clickableIssues = await page.evaluate(() => {
    const issues = [];
    const divClicks = document.querySelectorAll('div[onclick], span[onclick]');
    if (divClicks.length > 0) {
      issues.push(`${divClicks.length} non-semantic clickable elements (div/span with onclick)`);
    }
    return issues;
  });
  clickableIssues.forEach(c => issues.push({ type: 'SEMANTIC', severity: 'low', detail: c }));

  // 9. Check for excessive whitespace / empty containers
  const whiteSpaceIssues = await page.evaluate(() => {
    const issues = [];
    const containers = document.querySelectorAll('div, section, main');
    let emptyLargeContainers = 0;
    containers.forEach(c => {
      const rect = c.getBoundingClientRect();
      if (rect.height > 200 && (!c.textContent?.trim() || c.textContent.trim().length < 3) && c.children.length === 0) {
        emptyLargeContainers++;
      }
    });
    if (emptyLargeContainers > 0) {
      issues.push(`${emptyLargeContainers} large empty containers (200px+ height)`);
    }
    return issues;
  });
  whiteSpaceIssues.forEach(w => issues.push({ type: 'WHITESPACE', severity: 'low', detail: w }));

  // 10. Check for text truncation issues
  const truncationIssues = await page.evaluate(() => {
    const issues = [];
    const truncated = document.querySelectorAll('[class*="truncate"], [class*="line-clamp"]');
    let overflowCount = 0;
    truncated.forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
        overflowCount++;
      }
    });
    if (overflowCount > 3) {
      issues.push(`${overflowCount} elements with text being cut off`);
    }
    return issues;
  });
  truncationIssues.forEach(t => issues.push({ type: 'TRUNCATION', severity: 'low', detail: t }));

  // Add console errors
  if (consoleErrors.length > 0) {
    issues.push({ type: 'CONSOLE_ERROR', severity: 'high', detail: `${consoleErrors.length} console errors: ${consoleErrors.slice(0, 3).join(' | ')}` });
  }

  // Add network failures
  if (networkErrors.length > 0) {
    issues.push({ type: 'NETWORK', severity: 'medium', detail: `${networkErrors.length} failed requests: ${networkErrors.slice(0, 3).map(e => e.url).join(' | ')}` });
  }

  // Take screenshot
  const screenshotPath = path.join(OUT_DIR, `${route.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Also take dark mode screenshot
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(500);
  const darkScreenshotPath = path.join(OUT_DIR, `${route.name}-dark.png`);
  await page.screenshot({ path: darkScreenshotPath, fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  return {
    route: route.path,
    name: route.name,
    screenshot: screenshotPath,
    darkScreenshot: darkScreenshotPath,
    issueCount: issues.length,
    issues,
  };
}

async function main() {
  console.log(`🔍 Starting full audit of ${ROUTES.length} pages...`);
  console.log(`📸 Screenshots → ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
  });

  const results = [];
  let totalIssues = 0;

  for (const route of ROUTES) {
    const page = await context.newPage();
    console.log(`  ▸ ${route.path} (${route.name})...`);

    const result = await auditPage(page, route);
    results.push(result);
    totalIssues += result.issueCount;

    if (result.issueCount > 0) {
      console.log(`    ⚠ ${result.issueCount} issues found`);
      result.issues.forEach(i => console.log(`      [${i.severity}] ${i.type}: ${i.detail}`));
    } else {
      console.log(`    ✓ Clean`);
    }

    await page.close();
  }

  await browser.close();

  // ─── Summary Report ───
  const report = {
    timestamp: new Date().toISOString(),
    totalPages: ROUTES.length,
    totalIssues,
    bySeverity: {
      critical: results.flatMap(r => r.issues).filter(i => i.severity === 'critical').length,
      high: results.flatMap(r => r.issues).filter(i => i.severity === 'high').length,
      medium: results.flatMap(r => r.issues).filter(i => i.severity === 'medium').length,
      low: results.flatMap(r => r.issues).filter(i => i.severity === 'low').length,
    },
    pages: results,
  };

  const reportPath = path.join(OUT_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown summary
  let md = `# MHub Full Page Audit Report\n\n`;
  md += `**Date:** ${report.timestamp}\n`;
  md += `**Pages Audited:** ${report.totalPages}\n`;
  md += `**Total Issues:** ${report.totalIssues}\n\n`;
  md += `## Severity Breakdown\n`;
  md += `| Severity | Count |\n|---|---|\n`;
  md += `| 🔴 Critical | ${report.bySeverity.critical} |\n`;
  md += `| 🟠 High | ${report.bySeverity.high} |\n`;
  md += `| 🟡 Medium | ${report.bySeverity.medium} |\n`;
  md += `| 🔵 Low | ${report.bySeverity.low} |\n\n`;

  md += `## Page-by-Page Issues\n\n`;
  for (const page of results) {
    if (page.issueCount === 0) continue;
    md += `### ${page.route} (${page.name})\n`;
    md += `| Type | Severity | Detail |\n|---|---|---|\n`;
    for (const issue of page.issues) {
      md += `| ${issue.type} | ${issue.severity} | ${issue.detail.replace(/\|/g, '\\|')} |\n`;
    }
    md += `\n`;
  }

  md += `## Clean Pages (No Issues)\n`;
  const clean = results.filter(r => r.issueCount === 0);
  if (clean.length > 0) {
    clean.forEach(r => { md += `- ✅ ${r.route}\n`; });
  } else {
    md += `None\n`;
  }

  const mdPath = path.join(OUT_DIR, 'audit-report.md');
  fs.writeFileSync(mdPath, md);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  AUDIT COMPLETE`);
  console.log(`  Pages: ${report.totalPages} | Issues: ${report.totalIssues}`);
  console.log(`  Critical: ${report.bySeverity.critical} | High: ${report.bySeverity.high} | Medium: ${report.bySeverity.medium} | Low: ${report.bySeverity.low}`);
  console.log(`  Report: ${reportPath}`);
  console.log(`  Summary: ${mdPath}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
