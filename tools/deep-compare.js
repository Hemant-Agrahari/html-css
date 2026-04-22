const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGINAL_URL = 'https://www.ohsgaming.com/custom-igaming-services';
const LOCAL_URL = 'http://localhost:5000/custom-igaming-services';

async function scrollAndWait(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
  await page.waitForTimeout(3000);
}

async function extractDetailedData(page, label) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await scrollAndWait(page);
  await page.waitForTimeout(2000);

  // Extract all heading styles with matching by content
  const headings = await page.evaluate(() => {
    const results = [];
    for (const tag of ['h1','h2','h3','h4','h5','h6']) {
      document.querySelectorAll(tag).forEach(el => {
        const cs = getComputedStyle(el);
        const text = el.textContent?.trim().substring(0, 80) || '';
        if (!text) return;
        results.push({
          tag, text,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
          color: cs.color,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          textTransform: cs.textTransform,
          letterSpacing: cs.letterSpacing,
        });
      });
    }
    return results;
  });

  // Extract paragraph/body text styles
  const bodyText = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('p').forEach((el, i) => {
      if (i > 30) return;
      const cs = getComputedStyle(el);
      const text = el.textContent?.trim().substring(0, 80) || '';
      if (!text || text.length < 10) return;
      results.push({
        tag: 'p', index: i, text,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        fontFamily: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        color: cs.color,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
      });
    });
    return results;
  });

  // Extract button styles
  const buttons = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a.btn, button, .header-btn, .primary_bg, [class*="btn"]').forEach((el, i) => {
      if (i > 20) return;
      const cs = getComputedStyle(el);
      const text = el.textContent?.trim().substring(0, 60) || '';
      if (!text) return;
      results.push({
        tag: el.tagName, index: i, text,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        fontFamily: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
      });
    });
    return results;
  });

  // Check all images after scroll
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((img, i) => ({
      index: i,
      src: img.getAttribute('src') || '',
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.offsetWidth,
      displayHeight: img.offsetHeight,
      loading: img.getAttribute('loading'),
      hasWidth: img.hasAttribute('width'),
      hasHeight: img.hasAttribute('height'),
      widthAttr: img.getAttribute('width'),
      heightAttr: img.getAttribute('height'),
      visible: img.offsetParent !== null,
      broken: img.complete && img.naturalWidth === 0,
    }));
  });

  // Section heights
  const sections = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('section, [class*="py-50"], [class*="banner"], [class*="hero"], [class*="cta"]')).slice(0, 30).map((sec, i) => {
      const cs = getComputedStyle(sec);
      return {
        index: i,
        className: sec.className?.substring(0, 100),
        tag: sec.tagName,
        height: sec.offsetHeight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
      };
    });
  });

  // Take full-page screenshot
  const dir = path.join(__dirname, '..', 'comparison-screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${label}-full.png`), fullPage: true });

  return { headings, bodyText, buttons, images, sections };
}

function matchAndCompare(origItems, localItems, key = 'text') {
  const diffs = [];
  for (const o of origItems) {
    const match = localItems.find(l => l[key] === o[key] && l.tag === o.tag);
    if (!match) continue;
    const issues = [];
    const props = ['fontSize', 'fontWeight', 'lineHeight', 'color', 'marginTop', 'marginBottom', 'fontFamily', 'textTransform', 'letterSpacing', 'backgroundColor', 'padding', 'borderRadius'];
    for (const p of props) {
      if (o[p] !== undefined && match[p] !== undefined && o[p] !== match[p]) {
        issues.push({ prop: p, original: o[p], local: match[p] });
      }
    }
    if (issues.length > 0) {
      diffs.push({ tag: o.tag, text: o.text, issues });
    }
  }
  return diffs;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('Analyzing ORIGINAL...');
  const origPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await origPage.goto(ORIGINAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const orig = await extractDetailedData(origPage, 'original');

  console.log('Analyzing LOCAL...');
  const localPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await localPage.goto(LOCAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const local = await extractDetailedData(localPage, 'local');

  console.log('\n' + '='.repeat(70));
  console.log('  DETAILED COMPARISON REPORT');
  console.log('='.repeat(70));

  // HEADINGS
  const headingDiffs = matchAndCompare(orig.headings, local.headings);
  console.log(`\n### HEADING DIFFERENCES (${headingDiffs.length}) ###`);
  for (const d of headingDiffs) {
    console.log(`\n  [${d.tag}] "${d.text}"`);
    for (const i of d.issues) {
      console.log(`    ${i.prop}: ORIG="${i.original}" LOCAL="${i.local}"`);
    }
  }

  // BODY TEXT
  const bodyDiffs = matchAndCompare(orig.bodyText, local.bodyText);
  console.log(`\n### BODY TEXT DIFFERENCES (${bodyDiffs.length}) ###`);
  for (const d of bodyDiffs) {
    console.log(`\n  [${d.tag}] "${d.text}"`);
    for (const i of d.issues) {
      console.log(`    ${i.prop}: ORIG="${i.original}" LOCAL="${i.local}"`);
    }
  }

  // BUTTONS
  const btnDiffs = matchAndCompare(orig.buttons, local.buttons);
  console.log(`\n### BUTTON DIFFERENCES (${btnDiffs.length}) ###`);
  for (const d of btnDiffs) {
    console.log(`\n  [${d.tag}] "${d.text}"`);
    for (const i of d.issues) {
      console.log(`    ${i.prop}: ORIG="${i.original}" LOCAL="${i.local}"`);
    }
  }

  // IMAGES
  console.log(`\n### IMAGE REPORT ###`);
  console.log(`  Original images: ${orig.images.length}, Local images: ${local.images.length}`);

  const brokenLocal = local.images.filter(i => i.broken && i.visible);
  console.log(`  Truly broken (visible+broken): ${brokenLocal.length}`);
  for (const b of brokenLocal) {
    console.log(`    BROKEN: ${b.src} (alt: ${b.alt})`);
  }

  // Images missing lazy loading (not in first 3)
  const missingLazy = local.images.filter((img, i) => i > 2 && img.loading !== 'lazy' && img.visible);
  console.log(`  Missing lazy loading (below fold): ${missingLazy.length}`);
  for (const m of missingLazy.slice(0, 10)) {
    console.log(`    [${m.index}] loading="${m.loading}" src=${m.src}`);
  }

  // Missing dimensions
  const missingDims = local.images.filter(img => (!img.hasWidth || !img.hasHeight) && img.visible);
  console.log(`  Missing width/height attributes: ${missingDims.length}`);
  for (const m of missingDims) {
    console.log(`    [${m.index}] ${m.src} (natural: ${m.naturalWidth}x${m.naturalHeight})`);
  }

  // Image size diffs
  console.log(`  Size differences (display):`);
  for (let i = 0; i < Math.min(orig.images.length, local.images.length); i++) {
    const o = orig.images[i];
    const l = local.images[i];
    if (Math.abs(o.displayWidth - l.displayWidth) > 5 || Math.abs(o.displayHeight - l.displayHeight) > 5) {
      console.log(`    [${i}] orig=${o.displayWidth}x${o.displayHeight} local=${l.displayWidth}x${l.displayHeight} src=${l.src}`);
    }
  }

  // SECTION COMPARISON
  console.log(`\n### SECTION HEIGHT DIFFERENCES ###`);
  for (let i = 0; i < Math.min(orig.sections.length, local.sections.length); i++) {
    const o = orig.sections[i];
    const l = local.sections[i];
    const diff = Math.abs(o.height - l.height);
    if (diff > 10) {
      console.log(`  [${i}] "${l.className}"`);
      console.log(`    Height: ORIG=${o.height}px LOCAL=${l.height}px (diff=${diff}px)`);
      console.log(`    Padding: ORIG top=${o.paddingTop} bot=${o.paddingBottom} | LOCAL top=${l.paddingTop} bot=${l.paddingBottom}`);
    }
  }

  // Save full data
  const reportPath = path.join(__dirname, '..', 'comparison-screenshots', 'deep-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ orig, local, headingDiffs, bodyDiffs, btnDiffs }, null, 2));
  console.log(`\nFull data saved to: ${reportPath}`);

  await browser.close();
})();
