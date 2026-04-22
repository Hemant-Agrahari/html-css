#!/usr/bin/env node
/**
 * Extract per-page CSS — Uses Playwright CSS Coverage to determine which
 * CSS rules each page actually uses, then creates individual CSS files.
 *
 * For each page:
 *   1. Load page at desktop + mobile viewports
 *   2. Collect CSS coverage (which bytes of each stylesheet are used)
 *   3. Extract used CSS text
 *   4. Write to shared/css/pages/{page-name}.css
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_DIR = path.join(__dirname, '..', 'shared', 'css', 'pages');

// CSS files to extract from (the local vendor + global CSS)
// Bootstrap is excluded — it stays as a separate render-blocking file
const TARGET_CSS_PATTERNS = [
  '/css/vendor/site-main.css',
  '/css/vendor/site-components.css',
  '/css/vendor/site-pages.css',
  '/css/vendor/site-templates.css',
  '/css/vendor/site-service-pages.css',
  '/css/global.css',
];

function getPages() {
  return fs.readdirSync(DIST_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const name = f.replace('.html', '');
      const url = name === 'index' ? '/' : '/' + name;
      return { name, url, file: f };
    });
}

async function extractUsedCSS(browser, pageUrl, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile || false,
  });
  const page = await context.newPage();

  // Start CSS coverage
  await page.coverage.startCSSCoverage();

  await page.goto(`${BASE_URL}${pageUrl}`, { waitUntil: 'networkidle', timeout: 15000 });
  // Scroll to bottom to trigger all lazy-loaded styles
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  // Scroll back
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const coverage = await page.coverage.stopCSSCoverage();
  await context.close();

  // Extract used CSS from target files
  const usedCSS = [];
  for (const entry of coverage) {
    const urlPath = new URL(entry.url).pathname;
    // Only extract from our target CSS files
    if (!TARGET_CSS_PATTERNS.some(p => urlPath.endsWith(p))) continue;

    const text = entry.text;
    for (const range of entry.ranges) {
      usedCSS.push(text.substring(range.start, range.end));
    }
  }

  return usedCSS.join('\n');
}

async function main() {
  const pages = getPages();
  console.log(`\nPer-Page CSS Extraction`);
  console.log(`Pages: ${pages.length}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  for (const pg of pages) {
    process.stdout.write(`  ${pg.name}... `);

    try {
      // Extract CSS at both viewports and merge
      const desktopCSS = await extractUsedCSS(browser, pg.url, { width: 1440, height: 900 });
      const mobileCSS = await extractUsedCSS(browser, pg.url, { width: 375, height: 812, isMobile: true });

      // Merge and deduplicate
      const allRules = new Set();
      desktopCSS.split('\n').forEach(r => { if (r.trim()) allRules.add(r.trim()); });
      mobileCSS.split('\n').forEach(r => { if (r.trim()) allRules.add(r.trim()); });

      const merged = Array.from(allRules).join('\n');
      const outputName = pg.name === 'index' ? 'home.css' : pg.name + '.css';
      const outputPath = path.join(OUTPUT_DIR, outputName);

      // Read existing page CSS if it exists and prepend it
      let existingCSS = '';
      if (fs.existsSync(outputPath)) {
        existingCSS = fs.readFileSync(outputPath, 'utf-8');
      }

      // Combine: existing page-specific CSS + extracted used vendor CSS
      const finalCSS = `/* Page: ${pg.name} — auto-extracted used CSS */\n${merged}\n\n/* Original page-specific CSS */\n${existingCSS}`;

      fs.writeFileSync(outputPath, finalCSS, 'utf-8');

      const sizeKB = (Buffer.byteLength(finalCSS) / 1024).toFixed(1);
      console.log(`${sizeKB}KB (${allRules.size} rules)`);
      results.push({ page: pg.name, size: sizeKB, rules: allRules.size });
    } catch (err) {
      console.log(`ERROR: ${err.message.substring(0, 60)}`);
    }
  }

  await browser.close();

  // Summary
  const totalOriginal = TARGET_CSS_PATTERNS.reduce((sum, p) => {
    const file = path.join(DIST_DIR, p);
    return sum + (fs.existsSync(file) ? fs.statSync(file).size : 0);
  }, 0);

  console.log(`\n--- Summary ---`);
  console.log(`Original combined CSS: ${(totalOriginal / 1024).toFixed(0)}KB`);
  console.log(`Per-page CSS files created: ${results.length}`);
  results.forEach(r => console.log(`  ${r.page}: ${r.size}KB`));
}

main().catch(console.error);
