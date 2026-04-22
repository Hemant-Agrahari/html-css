/**
 * Playwright-based performance audit for ohsgaming.com
 * Captures: performance metrics, resource loading, CLS, LCP, network waterfall
 */
const { chromium } = require('playwright');

const URL = 'https://www.ohsgaming.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // Collect network requests
  const requests = [];
  page.on('request', req => {
    requests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      timestamp: Date.now(),
    });
  });

  const responses = [];
  page.on('response', res => {
    const headers = res.headers();
    responses.push({
      url: res.url(),
      status: res.status(),
      contentType: headers['content-type'] || '',
      contentLength: parseInt(headers['content-length'] || '0', 10),
      cacheControl: headers['cache-control'] || '',
      transferSize: parseInt(headers['content-length'] || '0', 10),
    });
  });

  // Enable CDP for performance metrics
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  PERFORMANCE AUDIT: ${URL}`);
  console.log(`  Desktop (1920x1080) — ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  // --- Navigation with performance timing ---
  const navStart = Date.now();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  const navEnd = Date.now();

  // Wait for any lazy content
  await page.waitForTimeout(3000);

  // --- Performance Timing API ---
  const perfTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    return {
      // Navigation timing
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ssl: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
      ttfb: nav.responseStart - nav.requestStart,
      download: nav.responseEnd - nav.responseStart,
      domInteractive: nav.domInteractive,
      domContentLoaded: nav.domContentLoadedEventEnd,
      loadComplete: nav.loadEventEnd,
      transferSize: nav.transferSize,
      encodedBodySize: nav.encodedBodySize,
      decodedBodySize: nav.decodedBodySize,
      // Paint timing
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
      fp: paint.find(p => p.name === 'first-paint')?.startTime || null,
    };
  });

  // --- LCP ---
  const lcp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        resolve({
          time: last.startTime,
          element: last.element?.tagName || 'unknown',
          url: last.url || '',
          size: last.size,
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve({ time: null, element: 'timeout' }), 3000);
    });
  });

  // --- CLS ---
  const cls = await page.evaluate(() => {
    return new Promise(resolve => {
      let clsValue = 0;
      const shifts = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            shifts.push({
              value: entry.value,
              sources: entry.sources?.map(s => ({
                node: s.node?.tagName || 'unknown',
                previousRect: s.previousRect,
                currentRect: s.currentRect,
              })) || [],
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => resolve({ total: clsValue, shifts }), 2000);
    });
  });

  // --- Resource summary ---
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    const byType = {};
    entries.forEach(e => {
      const type = e.initiatorType || 'other';
      if (!byType[type]) byType[type] = { count: 0, totalSize: 0, totalDuration: 0, items: [] };
      byType[type].count++;
      byType[type].totalSize += e.transferSize || 0;
      byType[type].totalDuration += e.duration || 0;
      byType[type].items.push({
        name: e.name,
        transferSize: e.transferSize,
        duration: e.duration,
        decodedBodySize: e.decodedBodySize,
      });
    });
    return { byType, totalEntries: entries.length };
  });

  // --- Render-blocking resources ---
  const renderBlocking = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return entries
      .filter(e => e.renderBlockingStatus === 'blocking')
      .map(e => ({
        url: e.name,
        type: e.initiatorType,
        duration: Math.round(e.duration),
        size: e.transferSize,
      }));
  });

  // --- DOM stats ---
  const domStats = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const images = document.querySelectorAll('img');
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const scripts = document.querySelectorAll('script');
    const inlineScripts = document.querySelectorAll('script:not([src])');
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    const inlineStyles = document.querySelectorAll('style');
    const iframes = document.querySelectorAll('iframe');

    // Check for images without dimensions
    const imagesNoDimensions = [];
    images.forEach(img => {
      if (!img.width && !img.height && !img.getAttribute('width') && !img.getAttribute('height')) {
        imagesNoDimensions.push({ src: img.src, alt: img.alt });
      }
    });

    // Check for images without alt
    const imagesNoAlt = [];
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('role') === 'presentation') {
        imagesNoAlt.push({ src: img.src });
      }
    });

    // Max DOM depth
    let maxDepth = 0;
    function getDepth(el, depth) {
      if (depth > maxDepth) maxDepth = depth;
      for (const child of el.children) getDepth(child, depth + 1);
    }
    getDepth(document.body, 0);

    return {
      totalElements: all.length,
      images: images.length,
      lazyImages: lazyImages.length,
      scripts: scripts.length,
      inlineScripts: inlineScripts.length,
      stylesheets: stylesheets.length,
      inlineStyles: inlineStyles.length,
      iframes: iframes.length,
      imagesNoDimensions,
      imagesNoAlt: imagesNoAlt.slice(0, 20),
      maxDOMDepth: maxDepth,
    };
  });

  // --- Third-party scripts ---
  const thirdParty = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const links = Array.from(document.querySelectorAll('link[href]'));
    const domain = window.location.hostname;

    const thirdPartyScripts = scripts
      .filter(s => { try { return new URL(s.src).hostname !== domain; } catch { return false; } })
      .map(s => ({ src: s.src, async: s.async, defer: s.defer }));

    const thirdPartyCSS = links
      .filter(l => l.rel === 'stylesheet')
      .filter(l => { try { return new URL(l.href).hostname !== domain; } catch { return false; } })
      .map(l => ({ href: l.href }));

    return { scripts: thirdPartyScripts, css: thirdPartyCSS };
  });

  // --- Security headers check ---
  const mainResponse = responses.find(r => r.url === URL || r.url === URL + '/');

  // --- Print report ---
  console.log('1. NAVIGATION TIMING');
  console.log('-'.repeat(50));
  console.log(`   DNS Lookup:        ${perfTiming.dns.toFixed(0)} ms`);
  console.log(`   TCP Connection:    ${perfTiming.tcp.toFixed(0)} ms`);
  console.log(`   SSL Handshake:     ${perfTiming.ssl.toFixed(0)} ms`);
  console.log(`   TTFB:              ${perfTiming.ttfb.toFixed(0)} ms`);
  console.log(`   Content Download:  ${perfTiming.download.toFixed(0)} ms`);
  console.log(`   DOM Interactive:   ${perfTiming.domInteractive.toFixed(0)} ms`);
  console.log(`   DOM Content Loaded:${perfTiming.domContentLoaded.toFixed(0)} ms`);
  console.log(`   Full Load:         ${perfTiming.loadComplete.toFixed(0)} ms`);
  console.log(`   HTML Size:         ${(perfTiming.decodedBodySize / 1024).toFixed(1)} KB (${(perfTiming.encodedBodySize / 1024).toFixed(1)} KB compressed)`);
  console.log(`   Wall clock load:   ${navEnd - navStart} ms`);

  console.log(`\n2. CORE WEB VITALS (Lab)`);
  console.log('-'.repeat(50));
  console.log(`   First Paint:       ${perfTiming.fp ? perfTiming.fp.toFixed(0) + ' ms' : 'N/A'}`);
  console.log(`   FCP:               ${perfTiming.fcp ? perfTiming.fcp.toFixed(0) + ' ms' : 'N/A'}`);
  console.log(`   LCP:               ${lcp.time ? lcp.time.toFixed(0) + ' ms' : 'N/A'}`);
  console.log(`   LCP Element:       <${lcp.element}> ${lcp.url ? '(' + lcp.url.substring(0, 80) + ')' : ''}`);
  console.log(`   LCP Size:          ${lcp.size || 'N/A'}`);
  console.log(`   CLS:               ${cls.total.toFixed(4)}`);
  if (cls.shifts.length > 0) {
    console.log(`   Layout Shifts:     ${cls.shifts.length} shifts detected`);
    cls.shifts.forEach((s, i) => {
      console.log(`     Shift ${i + 1}: value=${s.value.toFixed(4)}, sources=${s.sources.map(x => x.node).join(', ')}`);
    });
  }

  console.log(`\n3. RENDER-BLOCKING RESOURCES (${renderBlocking.length})`);
  console.log('-'.repeat(50));
  if (renderBlocking.length === 0) {
    console.log('   None detected (or browser did not flag them)');
  }
  renderBlocking.forEach(r => {
    const short = r.url.length > 90 ? r.url.substring(0, 90) + '...' : r.url;
    console.log(`   [${r.type}] ${short}`);
    console.log(`     Duration: ${r.duration} ms, Size: ${(r.size / 1024).toFixed(1)} KB`);
  });

  console.log(`\n4. RESOURCE BREAKDOWN`);
  console.log('-'.repeat(50));
  let totalTransfer = 0;
  Object.entries(resources.byType).sort((a, b) => b[1].totalSize - a[1].totalSize).forEach(([type, data]) => {
    totalTransfer += data.totalSize;
    console.log(`   ${type}: ${data.count} requests, ${(data.totalSize / 1024).toFixed(1)} KB`);
  });
  console.log(`   TOTAL: ${resources.totalEntries} requests, ${(totalTransfer / 1024).toFixed(1)} KB`);

  // Top 10 largest resources
  console.log(`\n5. TOP 15 LARGEST RESOURCES`);
  console.log('-'.repeat(50));
  const allResources = [];
  Object.values(resources.byType).forEach(d => allResources.push(...d.items));
  allResources.sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0));
  allResources.slice(0, 15).forEach((r, i) => {
    const name = r.name.length > 85 ? '...' + r.name.slice(-85) : r.name;
    console.log(`   ${i + 1}. ${(r.transferSize / 1024).toFixed(1)} KB — ${name}`);
    console.log(`      Decoded: ${(r.decodedBodySize / 1024).toFixed(1)} KB, Duration: ${r.duration.toFixed(0)} ms`);
  });

  console.log(`\n6. DOM STATISTICS`);
  console.log('-'.repeat(50));
  console.log(`   Total Elements:    ${domStats.totalElements}`);
  console.log(`   Max DOM Depth:     ${domStats.maxDOMDepth}`);
  console.log(`   Images:            ${domStats.images} (${domStats.lazyImages} lazy)`);
  console.log(`   Scripts:           ${domStats.scripts} (${domStats.inlineScripts} inline)`);
  console.log(`   Stylesheets:       ${domStats.stylesheets} external, ${domStats.inlineStyles} inline`);
  console.log(`   Iframes:           ${domStats.iframes}`);

  if (domStats.imagesNoDimensions.length > 0) {
    console.log(`\n   Images WITHOUT explicit dimensions (causes CLS):`);
    domStats.imagesNoDimensions.slice(0, 10).forEach(img => {
      const src = img.src.length > 80 ? '...' + img.src.slice(-80) : img.src;
      console.log(`     - ${src}`);
    });
    if (domStats.imagesNoDimensions.length > 10) {
      console.log(`     ... and ${domStats.imagesNoDimensions.length - 10} more`);
    }
  }

  if (domStats.imagesNoAlt.length > 0) {
    console.log(`\n   Images WITHOUT alt text:`);
    domStats.imagesNoAlt.forEach(img => {
      const src = img.src.length > 80 ? '...' + img.src.slice(-80) : img.src;
      console.log(`     - ${src}`);
    });
  }

  console.log(`\n7. THIRD-PARTY RESOURCES`);
  console.log('-'.repeat(50));
  console.log(`   Third-party scripts: ${thirdParty.scripts.length}`);
  thirdParty.scripts.forEach(s => {
    const src = s.src.length > 80 ? '...' + s.src.slice(-80) : s.src;
    console.log(`     ${s.async ? '[async]' : s.defer ? '[defer]' : '[BLOCKING]'} ${src}`);
  });
  if (thirdParty.css.length > 0) {
    console.log(`   Third-party CSS: ${thirdParty.css.length}`);
    thirdParty.css.forEach(c => console.log(`     ${c.href}`));
  }

  console.log(`\n8. CACHING ANALYSIS`);
  console.log('-'.repeat(50));
  const noCacheResources = responses.filter(r =>
    r.status === 200 &&
    !r.url.includes('analytics') &&
    !r.url.includes('gtm') &&
    (!r.cacheControl || r.cacheControl.includes('no-cache') || r.cacheControl.includes('no-store'))
  );
  console.log(`   Resources without effective caching: ${noCacheResources.length}`);
  noCacheResources.slice(0, 10).forEach(r => {
    const url = r.url.length > 80 ? '...' + r.url.slice(-80) : r.url;
    console.log(`     ${url}`);
    console.log(`       Cache-Control: ${r.cacheControl || 'NONE'}`);
  });

  // --- Slow resources ---
  console.log(`\n9. SLOWEST RESOURCES (by duration)`);
  console.log('-'.repeat(50));
  allResources.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  allResources.slice(0, 10).forEach((r, i) => {
    const name = r.name.length > 80 ? '...' + r.name.slice(-80) : r.name;
    console.log(`   ${i + 1}. ${r.duration.toFixed(0)} ms — ${name}`);
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log('  AUDIT COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  await browser.close();
})().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
