const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGINAL_URL = 'https://www.ohsgaming.com/custom-igaming-services';
const LOCAL_URL = 'http://192.168.1.156:5000/custom-igaming-services';

async function extractPageData(page, label) {
  // Wait for full load
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  // Extract typography data
  const typography = await page.evaluate(() => {
    const selectors = ['h1','h2','h3','h4','h5','h6','p','a','button','span','li','.btn','label'];
    const results = [];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      els.forEach((el, i) => {
        if (i > 20) return; // limit per selector
        const cs = getComputedStyle(el);
        const text = el.textContent?.trim().substring(0, 60) || '';
        if (!text) return;
        results.push({
          tag: sel,
          index: i,
          text,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily,
          color: cs.color,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          letterSpacing: cs.letterSpacing,
        });
      });
    }
    return results;
  });

  // Extract image data
  const images = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map((img, i) => ({
      index: i,
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
      displayWidth: img.offsetWidth,
      displayHeight: img.offsetHeight,
      loading: img.loading,
      complete: img.complete,
      broken: !img.complete || img.naturalWidth === 0,
      hasWidthAttr: img.hasAttribute('width'),
      hasHeightAttr: img.hasAttribute('height'),
    }));
  });

  // Extract layout sections
  const sections = await page.evaluate(() => {
    const secs = document.querySelectorAll('section, .section, [class*="section"], [class*="banner"], [class*="hero"]');
    return Array.from(secs).slice(0, 30).map((sec, i) => {
      const cs = getComputedStyle(sec);
      return {
        index: i,
        className: sec.className?.substring(0, 80),
        width: sec.offsetWidth,
        height: sec.offsetHeight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        backgroundColor: cs.backgroundColor,
      };
    });
  });

  // Take screenshots
  const screenshotDir = path.join(__dirname, '..', 'comparison-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  await page.screenshot({
    path: path.join(screenshotDir, `${label}-full.png`),
    fullPage: true
  });
  await page.screenshot({
    path: path.join(screenshotDir, `${label}-viewport.png`),
    fullPage: false
  });

  return { typography, images, sections };
}

function compareTypography(orig, local) {
  const diffs = [];
  const maxLen = Math.min(orig.length, local.length);

  for (let i = 0; i < maxLen; i++) {
    const o = orig[i];
    const l = local[i];
    if (o.text !== l.text) continue; // skip if text doesn't match (different element)

    const issues = [];
    if (o.fontSize !== l.fontSize) issues.push(`fontSize: ${o.fontSize} vs ${l.fontSize}`);
    if (o.fontWeight !== l.fontWeight) issues.push(`fontWeight: ${o.fontWeight} vs ${l.fontWeight}`);
    if (o.lineHeight !== l.lineHeight) issues.push(`lineHeight: ${o.lineHeight} vs ${l.lineHeight}`);
    if (o.color !== l.color) issues.push(`color: ${o.color} vs ${l.color}`);
    if (o.marginTop !== l.marginTop) issues.push(`marginTop: ${o.marginTop} vs ${l.marginTop}`);
    if (o.marginBottom !== l.marginBottom) issues.push(`marginBottom: ${o.marginBottom} vs ${l.marginBottom}`);
    if (o.fontFamily !== l.fontFamily) issues.push(`fontFamily differs`);

    if (issues.length > 0) {
      diffs.push({
        tag: o.tag,
        text: o.text,
        issues,
      });
    }
  }
  return diffs;
}

function compareImages(orig, local) {
  const report = {
    brokenLocal: [],
    missingInLocal: [],
    sizeDiffs: [],
    missingLazy: [],
    missingDimensions: [],
  };

  // Check local broken images
  for (const img of local) {
    if (img.broken) {
      report.brokenLocal.push({ src: img.src, alt: img.alt });
    }
    if (!img.loading || img.loading === 'eager') {
      // Only flag non-hero images
      if (img.index > 2) {
        report.missingLazy.push({ src: img.src, index: img.index });
      }
    }
    if (!img.hasWidthAttr || !img.hasHeightAttr) {
      report.missingDimensions.push({ src: img.src, index: img.index, width: img.width, height: img.height });
    }
  }

  // Compare with original
  for (let i = 0; i < Math.min(orig.length, local.length); i++) {
    const o = orig[i];
    const l = local[i];
    if (Math.abs(o.displayWidth - l.displayWidth) > 5 || Math.abs(o.displayHeight - l.displayHeight) > 5) {
      report.sizeDiffs.push({
        index: i,
        origSrc: o.src,
        localSrc: l.src,
        origSize: `${o.displayWidth}x${o.displayHeight}`,
        localSize: `${l.displayWidth}x${l.displayHeight}`,
      });
    }
  }

  return report;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('=== Analyzing ORIGINAL page ===');
  const origPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await origPage.goto(ORIGINAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const origData = await extractPageData(origPage, 'original');

  console.log('=== Analyzing LOCAL page ===');
  const localPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await localPage.goto(LOCAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const localData = await extractPageData(localPage, 'local');

  // Compare
  console.log('\n========================================');
  console.log('  COMPARISON REPORT');
  console.log('========================================\n');

  // Typography
  const typoDiffs = compareTypography(origData.typography, localData.typography);
  console.log(`\n--- FONT/TYPOGRAPHY DIFFERENCES (${typoDiffs.length} found) ---`);
  for (const d of typoDiffs) {
    console.log(`  [${d.tag}] "${d.text}"`);
    for (const issue of d.issues) {
      console.log(`    -> ${issue}`);
    }
  }

  // Images
  const imgReport = compareImages(origData.images, localData.images);
  console.log(`\n--- IMAGE REPORT ---`);
  console.log(`  Broken images in LOCAL: ${imgReport.brokenLocal.length}`);
  for (const b of imgReport.brokenLocal) {
    console.log(`    BROKEN: ${b.src} (alt: ${b.alt})`);
  }
  console.log(`  Size differences: ${imgReport.sizeDiffs.length}`);
  for (const s of imgReport.sizeDiffs) {
    console.log(`    [${s.index}] orig=${s.origSize} local=${s.localSize} src=${s.localSrc}`);
  }
  console.log(`  Missing lazy loading: ${imgReport.missingLazy.length}`);
  for (const m of imgReport.missingLazy) {
    console.log(`    [${m.index}] ${m.src}`);
  }
  console.log(`  Missing width/height attrs: ${imgReport.missingDimensions.length}`);
  for (const m of imgReport.missingDimensions) {
    console.log(`    [${m.index}] ${m.src} (natural: ${m.width}x${m.height})`);
  }

  // Sections
  console.log(`\n--- SECTION/LAYOUT COMPARISON ---`);
  const maxSec = Math.min(origData.sections.length, localData.sections.length);
  for (let i = 0; i < maxSec; i++) {
    const o = origData.sections[i];
    const l = localData.sections[i];
    const heightDiff = Math.abs(o.height - l.height);
    if (heightDiff > 10) {
      console.log(`  Section[${i}] "${l.className}": height ${o.height}px vs ${l.height}px (diff: ${heightDiff}px)`);
    }
  }

  // Full data dump for reference
  const reportPath = path.join(__dirname, '..', 'comparison-screenshots', 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    original: origData,
    local: localData,
    typoDiffs,
    imgReport,
  }, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);

  // Count stats
  console.log(`\n--- SUMMARY ---`);
  console.log(`Original images: ${origData.images.length}`);
  console.log(`Local images: ${localData.images.length}`);
  console.log(`Original typography elements: ${origData.typography.length}`);
  console.log(`Local typography elements: ${localData.typography.length}`);
  console.log(`Typography differences: ${typoDiffs.length}`);
  console.log(`Broken local images: ${imgReport.brokenLocal.length}`);
  console.log(`Image size differences: ${imgReport.sizeDiffs.length}`);

  await browser.close();
})();
