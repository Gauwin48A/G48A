import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const results = [];

  async function step(name) {
    await page.screenshot({ path: `/tmp/web_${name}.png`, fullPage: false });
    const text = await page.locator('body').innerText();
    results.push(`=== ${name} ===\n` + text.slice(0, 1500));
    console.log(`[${name}] Captured`);
  }

  try {
    // 1. Go to login page - use 'load' instead of 'networkidle' to avoid timeout
    console.log('Navigating to /login...');
    await page.goto(BASE + '/login', { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(3000);
    await step('01_login_page');

    // 2. Find and click 1-CLICK INSTANT DEMO LOGIN button
    const demoBtn = page.locator('button:has-text("1-CLICK INSTANT DEMO LOGIN")').first();
    const visible = await demoBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      console.log('Clicking 1-CLICK INSTANT DEMO LOGIN button...');
      await demoBtn.click();
    } else {
      console.log('Demo Login button not found, trying alternatives...');
      const altBtn = page.locator('button:has-text("demo")').first();
      if (await altBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await altBtn.click();
      }
    }

    await page.waitForTimeout(4000);
    await step('02_after_login');

    // 3. Navigate to profile
    console.log('Navigating to /profile...');
    await page.goto(BASE + '/profile', { waitUntil: 'load', timeout: 25000 }).catch(async () => {
      console.log('Profile navigation failed, trying to find profile link...');
      const pl = page.locator('a[href*="profile"]').first();
      if (await pl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pl.click();
        await page.waitForTimeout(3000);
      }
    });
    await page.waitForTimeout(3000);
    await step('03_profile_page');

    // 4. Analyze for KYC and plan
    const bodyText = await page.locator('body').innerText();
    const kycFound = /KYC.*Verified|Verified.*KYC|kyc.*verified/i.test(bodyText);
    const planFound = /Gold Plan|Premium Plan|Current Plan|current.*plan/i.test(bodyText);
    const premiumFound = /gold|premium/i.test(bodyText);
    
    console.log('=== VERIFICATION RESULTS ===');
    console.log('KYC Verified badge: ' + (kycFound ? 'YES' : 'NO'));
    console.log('Plan indicator: ' + (planFound ? 'YES' : 'NO'));
    console.log('Premium/Gold text: ' + (premiumFound ? 'YES' : 'NO'));
    console.log('');
    console.log('Full body text preview:');
    console.log(bodyText.slice(0, 3000));

  } catch (err) {
    console.error('Error:', err.message);
    await step('99_error').catch(() => {});
  }

  await browser.close();
  console.log('\n=== FULL RESULTS ===');
  console.log(results.join('\n\n'));
})();
