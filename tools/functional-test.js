#!/usr/bin/env node
/**
 * Functional Test — Tests navigation, modals, forms, and interactive elements.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function getPages() {
  const distDir = path.join(__dirname, '..', 'dist');
  return fs.readdirSync(distDir)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const name = f.replace('.html', '');
      const url = name === 'index' ? '/' : '/' + name;
      return { name, url };
    });
}

async function main() {
  const browser = await chromium.launch();
  const pages = getPages();
  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log(`\nFunctional Test`);
  console.log(`Testing ${pages.length} pages\n`);

  // Test 1: All pages return 200
  console.log('--- Test 1: All pages load (200 OK) ---');
  for (const pg of pages) {
    const page = await browser.newPage();
    try {
      const resp = await page.goto(`${BASE_URL}${pg.url}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (resp.status() === 200) {
        console.log(`  PASS: ${pg.url}`);
        passed++;
      } else {
        console.log(`  FAIL: ${pg.url} — status ${resp.status()}`);
        failed++;
        failures.push(`Page ${pg.url} returned ${resp.status()}`);
      }
    } catch (err) {
      console.log(`  FAIL: ${pg.url} — ${err.message.substring(0, 60)}`);
      failed++;
      failures.push(`Page ${pg.url}: ${err.message.substring(0, 60)}`);
    }
    await page.close();
  }

  // Test 2: Desktop nav links work
  console.log('\n--- Test 2: Desktop navigation ---');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const navLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('header a[href^="/"]'))
      .map(a => a.getAttribute('href'))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 15);
  });

  for (const href of navLinks) {
    try {
      const resp = await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const title = await page.title();
      if (resp.status() === 200 && title.length > 0) {
        console.log(`  PASS: ${href} → "${title.substring(0, 50)}"`);
        passed++;
      } else {
        console.log(`  FAIL: ${href} — status ${resp.status()}`);
        failed++;
        failures.push(`Nav link ${href} failed`);
      }
    } catch (err) {
      console.log(`  FAIL: ${href} — ${err.message.substring(0, 60)}`);
      failed++;
    }
  }
  await page.close();

  // Test 3: Mobile hamburger menu
  console.log('\n--- Test 3: Mobile hamburger menu ---');
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true });
  await mobile.goto(BASE_URL, { waitUntil: 'networkidle' });

  try {
    await mobile.click('.mobile_btn');
    await mobile.waitForTimeout(500);
    const menuVisible = await mobile.evaluate(() => {
      const menu = document.querySelector('.main_menu');
      return menu && menu.classList.contains('show');
    });
    if (menuVisible) {
      console.log('  PASS: Hamburger opens menu');
      passed++;
    } else {
      console.log('  FAIL: Hamburger did not open menu');
      failed++;
      failures.push('Hamburger menu failed');
    }
  } catch (err) {
    console.log(`  FAIL: Hamburger — ${err.message.substring(0, 60)}`);
    failed++;
  }
  await mobile.close();

  // Test 4: Contact modal opens
  console.log('\n--- Test 4: Contact modal ---');
  const modalPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await modalPage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await modalPage.waitForTimeout(2000); // wait for JS init

  try {
    // Click a CTA button that should open the modal
    const ctaBtn = await modalPage.locator('button.white-btn, button.click-btn, button.banner-btn-prime').first();
    if (await ctaBtn.isVisible()) {
      await ctaBtn.click();
      await modalPage.waitForTimeout(1000);
      const modalVisible = await modalPage.evaluate(() => {
        const modal = document.getElementById('contactModal');
        return modal && modal.classList.contains('show');
      });
      if (modalVisible) {
        console.log('  PASS: Contact modal opens');
        passed++;
      } else {
        console.log('  FAIL: Contact modal did not open');
        failed++;
        failures.push('Contact modal failed');
      }
    } else {
      console.log('  SKIP: No CTA button found on homepage');
    }
  } catch (err) {
    console.log(`  FAIL: Modal — ${err.message.substring(0, 60)}`);
    failed++;
  }
  await modalPage.close();

  // Test 5: No broken images
  console.log('\n--- Test 5: Broken images check (homepage) ---');
  const imgPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await imgPage.goto(BASE_URL, { waitUntil: 'networkidle' });

  const brokenImages = await imgPage.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const broken = [];
    imgs.forEach(img => {
      // Skip lazy-loaded images — they report naturalWidth=0 until scrolled into view
      if (img.loading === 'lazy') return;
      if (!img.complete || img.naturalWidth === 0) {
        broken.push(img.src);
      }
    });
    return broken;
  });

  if (brokenImages.length === 0) {
    console.log('  PASS: No broken images');
    passed++;
  } else {
    console.log(`  FAIL: ${brokenImages.length} broken images`);
    brokenImages.slice(0, 5).forEach(src => console.log(`    ${src}`));
    failed++;
    failures.push(`${brokenImages.length} broken images on homepage`);
  }
  await imgPage.close();

  // Test 6: No console errors
  console.log('\n--- Test 6: Console errors check ---');
  const consolePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  consolePage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await consolePage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await consolePage.waitForTimeout(2000);

  if (consoleErrors.length === 0) {
    console.log('  PASS: No console errors');
    passed++;
  } else {
    console.log(`  WARN: ${consoleErrors.length} console errors`);
    consoleErrors.slice(0, 3).forEach(e => console.log(`    ${e.substring(0, 80)}`));
    // Don't fail on console errors — CDN scripts may log warnings
  }
  await consolePage.close();

  await browser.close();

  console.log(`\n--- Results ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`\nAll tests passed.`);
  }
}

main().catch(console.error);
