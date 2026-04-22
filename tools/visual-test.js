#!/usr/bin/env node
/**
 * Visual Test — Screenshots all 32 pages at desktop + mobile viewports.
 * Usage: node tools/visual-test.js [before|after]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const PHASE = process.argv[2] || 'before'; // 'before' or 'after'
const OUT_DIR = path.join(SCREENSHOTS_DIR, PHASE);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812, isMobile: true },
];

// Get all pages from dist/
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = getPages();
  console.log(`\nVisual Test — Phase: ${PHASE}`);
  console.log(`Pages: ${pages.length} | Viewports: ${VIEWPORTS.length}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`--- ${vp.name} (${vp.width}x${vp.height}) ---`);

    for (const page of pages) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile || false,
      });
      const tab = await context.newPage();

      try {
        await tab.goto(`${BASE_URL}${page.url}`, { waitUntil: 'networkidle', timeout: 15000 });
        // Wait for AOS, lazy images, and deferred CSS to settle
        await tab.waitForTimeout(2500);

        const filename = `${page.name}_${vp.name}.png`;
        await tab.screenshot({
          path: path.join(OUT_DIR, filename),
          fullPage: true,
        });
        console.log(`  OK: ${filename}`);
      } catch (err) {
        console.log(`  FAIL: ${page.name}_${vp.name} — ${err.message.substring(0, 60)}`);
      }

      await context.close();
    }
  }

  await browser.close();

  const count = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webp')).length;
  console.log(`\nDone: ${count} screenshots saved to ${OUT_DIR}`);
}

main().catch(console.error);
