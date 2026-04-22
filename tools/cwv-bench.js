#!/usr/bin/env node
/**
 * CWV Benchmark — measures LCP, CLS, FCP, TBT, and transfer size across a set of pages.
 *
 * Throttled to 4G mobile + 4x CPU slowdown to simulate real-world conditions.
 * Starts a local server automatically. Outputs a comparable table.
 *
 * Usage:
 *   node tools/cwv-bench.js                 # default pages
 *   node tools/cwv-bench.js index contact-us white-label-igaming-platform
 *   node tools/cwv-bench.js --live          # hit live production instead of local
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = 5567;
const DEFAULT_PAGES = ['index', 'white-label-igaming-platform', 'contact-us'];

function startServer() {
  const mimes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webp': 'image/png', '.webp': 'image/jpeg',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    let filePath = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!path.extname(filePath) && !filePath.endsWith('/')) filePath += '.html';
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': mimes[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(PORT, () => r(server)));
}

async function measurePage(browser, url) {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const page = await ctx.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 150,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.addInitScript(() => {
    window.__shifts = []; window.__lcp = null; window.__fcp = null; window.__tasks = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { const es = l.getEntries(); window.__lcp = es[es.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 50) window.__tasks.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  });

  let transfer = 0;
  page.on('response', async r => { try { transfer += (await r.body()).length; } catch (e) {} });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    const { shifts, lcp, fcp, tasks } = await page.evaluate(() => ({
      shifts: window.__shifts, lcp: window.__lcp, fcp: window.__fcp, tasks: window.__tasks
    }));
    const cls = shifts.reduce((s, v) => s + v, 0);
    const tbt = tasks.reduce((s, d) => s + (d - 50), 0);
    return { lcp, cls, fcp, tbt, transfer, errors: errors.length };
  } catch (e) {
    return { error: e.message };
  } finally {
    await ctx.close();
  }
}

function fmt(n, unit = 'ms') {
  if (n == null) return '?';
  return n.toFixed(unit === 'ms' ? 0 : 3) + unit;
}
function verdict(v, thresholds) {
  if (v == null) return '?';
  return v < thresholds[0] ? '✅' : v < thresholds[1] ? '⚠️' : '❌';
}

(async () => {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const slugs = args.filter(a => !a.startsWith('-'));
  const pages = slugs.length ? slugs : DEFAULT_PAGES;
  const base = live ? 'https://www.ohsgaming.com' : `http://localhost:${PORT}`;
  const server = live ? null : await startServer();

  const browser = await chromium.launch();
  console.log(`\n=== CWV Benchmark — ${live ? 'LIVE' : 'LOCAL'} ===`);
  console.log(`Target: ${base}  (mobile 375x812, 4G throttled, 4x CPU)\n`);
  console.log('PAGE                                    LCP        CLS        FCP        TBT        TRANSFER');
  console.log('-'.repeat(100));

  for (const slug of pages) {
    const url = `${base}/${slug === 'index' || slug === '' ? '' : slug}?_=${Date.now()}`;
    const r = await measurePage(browser, url);
    if (r.error) {
      console.log(slug.padEnd(40) + 'ERROR: ' + r.error.substring(0, 50));
      continue;
    }
    const row = [
      (slug || 'home').padEnd(40),
      (fmt(r.lcp) + ' ' + verdict(r.lcp, [2500, 4000])).padEnd(12),
      (fmt(r.cls, '') + ' ' + verdict(r.cls, [0.1, 0.25])).padEnd(10),
      (fmt(r.fcp) + ' ' + verdict(r.fcp, [1800, 3000])).padEnd(10),
      (fmt(r.tbt) + ' ' + verdict(r.tbt, [200, 600])).padEnd(10),
      (r.transfer / 1024).toFixed(0) + 'KB' + (r.errors ? '  JS:' + r.errors : ''),
    ];
    console.log(row.join(' '));
  }

  await browser.close();
  if (server) server.close();
  console.log('\nThresholds: LCP<2.5s ✅ / <4s ⚠️   CLS<0.1 ✅ / <0.25 ⚠️   FCP<1.8s ✅ / <3s ⚠️   TBT<200ms ✅ / <600ms ⚠️');
})().catch(e => { console.error(e); process.exit(1); });
