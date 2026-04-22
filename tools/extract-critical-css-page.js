#!/usr/bin/env node
/**
 * Extracts critical above-fold CSS for a specific page using Playwright.
 * Renders the page at mobile + desktop viewports, identifies CSS rules that
 * apply to above-the-fold elements, and outputs a minimal CSS file.
 *
 * Usage:
 *   node tools/extract-critical-css-page.js white-label-igaming-platform
 *   node tools/extract-critical-css-page.js --all
 *
 * Output:
 *   shared/css/pages/{slug}.critical.css  (for build.js to inline)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SHARED_CSS = path.join(ROOT, 'shared', 'css', 'pages');
const PORT = 5556;

async function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
    if (!path.extname(filePath)) filePath += '.html';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const mimes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
        '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webp': 'image/png',
        '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
        '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(PORT, resolve));
  return server;
}

async function getCriticalForViewport(browser, width, height, url) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const critical = await page.evaluate(() => {
    const vh = window.innerHeight;
    const rules = [];

    // Critical: include rules for elements inside <header>/<nav>, even if hidden.
    // Without this, the mobile menu (display:none at small viewports) has no hide rule
    // in critical CSS, so the menu renders fully expanded before deferred CSS arrives,
    // causing huge CLS (~0.95 on white-label-igaming-platform before fix).
    //
    // Also: include rules for hero/banner sections so their layout is finalized during
    // first paint. Without this, the SECTION becomes the LCP element but its dimensions
    // depend on deferred CSS, gating LCP at ~3.5s instead of ~1s.
    const HERO_CLASSES = ['main-banner','franchise-banner','hire-page-wrapper','service-hero'];

    function isInChain(el, predicate) {
      let cur = el;
      while (cur && cur !== document.body) {
        if (predicate(cur)) return true;
        cur = cur.parentElement;
      }
      return false;
    }
    const isInNav = el => {
      const t = el.tagName?.toLowerCase();
      return t === 'header' || t === 'nav';
    };
    const isInHero = el => {
      if (!el.classList) return false;
      return HERO_CLASSES.some(c => el.classList.contains(c));
    };

    function isRuleCritical(selectorText) {
      let els;
      try { els = document.querySelectorAll(selectorText); } catch (e) { return false; }
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0 && r.height > 0) return true;
        // Hidden but in nav/header — still need the rule
        if (isInChain(el, isInNav)) return true;
        // In a hero/banner section — needs to lay out during first paint for LCP
        if (isInChain(el, isInHero)) return true;
      }
      return false;
    }

    for (const sheet of document.styleSheets) {
      try {
        const cssRules = sheet.cssRules || sheet.rules;
        if (!cssRules) continue;

        for (const rule of cssRules) {
          if (rule.type === CSSRule.STYLE_RULE) {
            if (isRuleCritical(rule.selectorText)) rules.push(rule.cssText);
          } else if (rule.type === CSSRule.MEDIA_RULE) {
            const mq = rule.conditionText || rule.media.mediaText;
            if (window.matchMedia(mq).matches) {
              const sub = [];
              for (const sr of rule.cssRules) {
                if (sr.type === CSSRule.STYLE_RULE && isRuleCritical(sr.selectorText)) {
                  sub.push(sr.cssText);
                }
              }
              if (sub.length) rules.push(`@media ${mq} { ${sub.join(' ')} }`);
            }
          } else if (rule.type === CSSRule.KEYFRAMES_RULE) {
            const name = rule.name;
            if (rules.some(r => r.includes(name))) {
              rules.push(rule.cssText);
            }
          }
        }
      } catch (e) {}
    }
    return rules;
  });

  await page.close();
  return critical;
}

async function extractForPage(browser, slug) {
  const url = `http://localhost:${PORT}/${slug === 'index' ? '' : slug}`;

  const mobileRules = await getCriticalForViewport(browser, 375, 812, url);
  const desktopRules = await getCriticalForViewport(browser, 1440, 900, url);

  const merged = [...new Set([...mobileRules, ...desktopRules])];
  const css = merged.join('\n');

  const outPath = path.join(SHARED_CSS, `${slug}.critical.css`);
  fs.writeFileSync(outPath, css);

  const sizeKB = (css.length / 1024).toFixed(1);
  console.log(`  ${slug}: ${sizeKB}KB (${merged.length} rules)`);

  return { slug, size: css.length, rules: merged.length };
}

async function main() {
  const args = process.argv.slice(2);
  const doAll = args.includes('--all');
  const slugs = doAll
    ? fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''))
    : args.filter(a => !a.startsWith('-'));

  if (!slugs.length) {
    console.log('Usage: node tools/extract-critical-css-page.js <slug> [slug2 ...] | --all');
    process.exit(1);
  }

  const server = await startServer();
  console.log(`Server on port ${PORT}, extracting critical CSS...`);

  const browser = await chromium.launch();

  try {
    for (const slug of slugs) {
      const htmlPath = path.join(DIST, `${slug}.html`);
      if (!fs.existsSync(htmlPath)) {
        console.log(`  ${slug}: SKIP (no HTML in dist/)`);
        continue;
      }
      await extractForPage(browser, slug);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('Done. Run `node build.js` to inline critical CSS into pages.');
}

main().catch(console.error);
