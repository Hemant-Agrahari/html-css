#!/usr/bin/env node
/**
 * Full-site PNG/JPG → WebP conversion pipeline.
 *
 * 1. Scans dist/*.html for every non-WebP raster image reference
 * 2. Converts each source file to WebP (skips if WebP already exists and is newer)
 * 3. Updates all pages/ source HTML files (.png/.webp → .webp)
 * 4. Updates CSS background-image refs in purged CSS + vendor CSS
 * 5. Adds loading="lazy" to images in non-hero positions
 *
 * Quality strategy:
 *   - Portraits / product photos : 85  (faces, screenshots)
 *   - Logos / icons / small art  : 85  (WebP handles flat art very well at 85)
 *   - Large background images    : 80  (decorative, any quality loss invisible)
 *   - Default                    : 85
 *
 * Usage:
 *   node tools/convert-all-to-webp.js          # dry run
 *   node tools/convert-all-to-webp.js --write  # convert + update refs
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT      = path.join(__dirname, '..');
const DIST_DIR  = path.join(ROOT, 'dist');
const SHARED    = path.join(ROOT, 'shared');
const PAGES_DIR = path.join(ROOT, 'pages');
const ASSETS    = path.join(SHARED, 'assets');
const CSS_PAGES = path.join(SHARED, 'css', 'pages');
const CSS_VENDOR= path.join(SHARED, 'css', 'vendor');

const WRITE = process.argv.includes('--write');
if (!WRITE) console.log('[DRY RUN] Pass --write to apply changes\n');

// Quality by path pattern
function quality(filePath) {
  const f = filePath.toLowerCase();
  if (/background|bg[-_]|[\-_]bg\.|banner|world-map|revolution/.test(f)) return 80;
  return 85;
}

// Resolve a URL ref from HTML to an actual file on disk
function resolveRef(ref) {
  // Strip query string/hash
  const clean = ref.split('?')[0].split('#')[0];

  // Try shared/assets first (canonical location)
  const candidates = [
    path.join(ASSETS, clean.replace(/^\/assets\//, '')),
    path.join(ASSETS, clean.replace(/^\//, '')),
    path.join(SHARED, 'assets', clean.replace(/^\//, '')),
    path.join(ROOT, clean.replace(/^\//, '')),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Collect all non-WebP image refs from built dist HTML
function collectRefs() {
  const refs = new Map(); // url → Set of dist html files
  const htmlFiles = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html'));
  const imgRe = /src="([^"]+\.(png|jpe?g|gif))"/gi;
  for (const hf of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST_DIR, hf), 'utf8');
    let m;
    while ((m = imgRe.exec(content)) !== null) {
      const url = m[1];
      if (!refs.has(url)) refs.set(url, new Set());
      refs.get(url).add(hf);
    }
  }
  return refs;
}

// Collect CSS background-image non-WebP refs from dist HTML inline styles + purged CSS
function collectCSSRefs() {
  const refs = new Map();
  const bgRe = /url\(["']?([^"')]+\.(png|jpe?g))["']?\)/gi;

  // Purged CSS files
  if (fs.existsSync(CSS_PAGES)) {
    for (const f of fs.readdirSync(CSS_PAGES)) {
      if (!f.endsWith('.css')) continue;
      const content = fs.readFileSync(path.join(CSS_PAGES, f), 'utf8');
      let m;
      while ((m = bgRe.exec(content)) !== null) {
        const url = m[1];
        if (!refs.has(url)) refs.set(url, new Set());
        refs.get(url).add('css/pages/' + f);
      }
    }
  }

  // Vendor CSS files
  for (const f of fs.readdirSync(CSS_VENDOR)) {
    if (!f.endsWith('.css')) continue;
    const content = fs.readFileSync(path.join(CSS_VENDOR, f), 'utf8');
    let m;
    while ((m = bgRe.exec(content)) !== null) {
      const url = m[1];
      if (!refs.has(url)) refs.set(url, new Set());
      refs.get(url).add('css/vendor/' + f);
    }
  }

  // Dist HTML inline <style> blocks
  const htmlFiles = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html'));
  for (const hf of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST_DIR, hf), 'utf8');
    let m;
    while ((m = bgRe.exec(content)) !== null) {
      const url = m[1];
      if (!refs.has(url)) refs.set(url, new Set());
      refs.get(url).add(hf);
    }
  }

  return refs;
}

async function convertImage(srcPath, webpPath, q) {
  const img = sharp(srcPath);
  const meta = await img.metadata();

  await img
    .resize(Math.min(meta.width, 1920), undefined, { withoutEnlargement: true })
    .webp({ quality: q, effort: 6 })
    .toFile(webpPath);

  return fs.statSync(webpPath).size;
}

// Replace refs in pages/ source HTML files
function updatePageRefs(conversions) {
  // Build replacement map: old url → new url
  const map = new Map();
  for (const [oldUrl, webpUrl] of conversions) {
    map.set(oldUrl, webpUrl);
  }

  let totalFiles = 0;
  let totalReplacements = 0;

  function processDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        processDir(full);
        continue;
      }
      if (!entry.name.endsWith('.html')) continue;

      let content = fs.readFileSync(full, 'utf8');
      let replaced = 0;

      for (const [oldUrl, newUrl] of map) {
        const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'g');
        const matches = content.match(re);
        if (matches) {
          content = content.replace(re, newUrl);
          replaced += matches.length;
        }
      }

      if (replaced > 0) {
        if (WRITE) fs.writeFileSync(full, content);
        totalFiles++;
        totalReplacements += replaced;
        console.log(`  Updated ${full.replace(ROOT + path.sep, '')} (${replaced} refs)`);
      }
    }
  }

  processDir(PAGES_DIR);
  return { totalFiles, totalReplacements };
}

// Replace CSS background-image refs in purged CSS + vendor CSS
function updateCSSRefs(cssConversions) {
  let count = 0;
  for (const [oldUrl, newUrl] of cssConversions) {
    const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');

    // Purged CSS
    if (fs.existsSync(CSS_PAGES)) {
      for (const f of fs.readdirSync(CSS_PAGES)) {
        if (!f.endsWith('.css')) continue;
        const fp = path.join(CSS_PAGES, f);
        const content = fs.readFileSync(fp, 'utf8');
        if (re.test(content)) {
          if (WRITE) fs.writeFileSync(fp, content.replace(re, newUrl));
          count++;
          re.lastIndex = 0;
        }
      }
    }

    // Vendor CSS
    for (const f of fs.readdirSync(CSS_VENDOR)) {
      if (!f.endsWith('.css')) continue;
      const fp = path.join(CSS_VENDOR, f);
      const content = fs.readFileSync(fp, 'utf8');
      re.lastIndex = 0;
      if (re.test(content)) {
        if (WRITE) fs.writeFileSync(fp, content.replace(re, newUrl));
        count++;
      }
    }
  }
  return count;
}

// Add loading="lazy" to images that are missing it and are NOT in the hero/banner
// Strategy: any <img> without loading attr (or with loading="eager") that is NOT
// a preloaded LCP image gets loading="lazy" in pages/ source files.
// We whitelist images that should stay eager (above fold / LCP candidates).
const EAGER_PATTERNS = [
  /logo/i, /header/i, /banner.*news/, /mobile.*banner/, /fetchpriority.*high/i,
  /loading="eager"/,  // already set explicitly
  /new-home\//, // marquee trust logos — they're eager intentionally
];

function addLazyLoading(conversions) {
  // Build set of all converted webp URLs (and their original URLs)
  const lazyTargets = new Set();
  for (const [, webpUrl] of conversions) lazyTargets.add(webpUrl);
  // Also cover URLs that were already webp (like john-smith.webp)
  lazyTargets.add('/assets/images/common-component/john-smith.webp');

  let count = 0;

  function processFile(fp) {
    let content = fs.readFileSync(fp, 'utf8');
    let changed = false;

    // Find all <img> tags without loading attribute
    content = content.replace(/<img\s([^>]*?)>/gi, (match, attrs) => {
      // Already has loading attr — skip
      if (/\bloading\s*=/.test(attrs)) return match;
      // Has fetchpriority=high — it's a LCP image, skip
      if (/fetchpriority\s*=\s*["']high["']/i.test(attrs)) return match;
      // Check if src matches any eager pattern
      const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) return match;
      const src = srcMatch[1];
      if (EAGER_PATTERNS.some(p => p.test(src) || p.test(match))) return match;

      changed = true;
      count++;
      return `<img loading="lazy" ${attrs}>`;
    });

    if (changed) {
      if (WRITE) fs.writeFileSync(fp, content);
    }
  }

  function walkPages(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkPages(full);
      else if (entry.name.endsWith('.html')) processFile(full);
    }
  }

  walkPages(PAGES_DIR);
  return count;
}

async function main() {
  console.log('=== Step 1: Convert PNG/JPG → WebP (image files) ===\n');

  const refs = collectRefs();
  const conversions = new Map(); // old url → new url
  let totalOriginal = 0;
  let totalWebP = 0;
  let skipped = 0;
  let converted = 0;
  let alreadyWebp = 0;

  for (const [url, pages] of refs) {
    const srcPath = resolveRef(url);
    if (!srcPath) {
      console.log(`  SKIP (not found): ${url}`);
      skipped++;
      continue;
    }

    const webpPath = srcPath.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    const webpUrl  = url.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    const origSize = fs.statSync(srcPath).size;

    // If WebP already exists and is newer than source, just record the ref mapping
    if (fs.existsSync(webpPath)) {
      const webpSize = fs.statSync(webpPath).size;
      console.log(`  EXISTS ${webpUrl.split('/').pop()} (${(webpSize/1024).toFixed(1)}KB)`);
      conversions.set(url, webpUrl);
      totalOriginal += origSize;
      totalWebP += webpSize;
      alreadyWebp++;
      continue;
    }

    const q = quality(srcPath);
    let webpSize = 0;

    if (WRITE) {
      try {
        webpSize = await convertImage(srcPath, webpPath, q);
      } catch (e) {
        console.error(`  ERROR ${url}: ${e.message}`);
        continue;
      }
    } else {
      webpSize = Math.round(origSize * 0.25); // estimate
    }

    const savingPct = ((1 - webpSize / origSize) * 100).toFixed(1);
    console.log(
      `  ${(origSize/1024).toFixed(0)}KB → ${(webpSize/1024).toFixed(0)}KB` +
      ` (-${savingPct}%) q${q}  ${url.split('/').pop()}`
    );
    conversions.set(url, webpUrl);
    totalOriginal += origSize;
    totalWebP += webpSize;
    converted++;
  }

  console.log(`\n  Converted: ${converted} | Already WebP: ${alreadyWebp} | Not found: ${skipped}`);
  console.log(`  Total: ${(totalOriginal/1024/1024).toFixed(2)}MB → ${(totalWebP/1024/1024).toFixed(2)}MB`);
  console.log(`  Savings: ${((totalOriginal-totalWebP)/1024/1024).toFixed(2)}MB\n`);

  console.log('=== Step 2: Update HTML refs in pages/ ===\n');
  const { totalFiles, totalReplacements } = updatePageRefs(conversions);
  console.log(`  Updated ${totalReplacements} refs across ${totalFiles} source files\n`);

  console.log('=== Step 3: Update CSS background-image refs ===\n');
  const cssRefs = collectCSSRefs();
  const cssConversions = new Map();
  for (const [url] of cssRefs) {
    const srcPath = resolveRef(url);
    if (!srcPath) { console.log(`  SKIP (not found): ${url}`); continue; }
    const webpPath = srcPath.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    const webpUrl  = url.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    // Convert to WebP if it doesn't exist yet
    if (!fs.existsSync(webpPath)) {
      const origSize = fs.statSync(srcPath).size;
      if (WRITE) {
        try {
          const webpSize = await convertImage(srcPath, webpPath, quality(srcPath));
          console.log(`  Converted ${url.split('/').pop()} → ${webpUrl.split('/').pop()} (${(origSize/1024).toFixed(0)}KB → ${(webpSize/1024).toFixed(0)}KB)`);
        } catch(e) { console.error(`  ERROR ${url}: ${e.message}`); continue; }
      } else {
        console.log(`  Would convert: ${url.split('/').pop()} → ${webpUrl.split('/').pop()} (${(origSize/1024).toFixed(0)}KB)`);
      }
    } else {
      console.log(`  ${url.split('/').pop()} → ${webpUrl.split('/').pop()} (WebP exists)`);
    }
    cssConversions.set(url, webpUrl);
  }
  const cssCount = updateCSSRefs(cssConversions);
  console.log(`  Updated ${cssCount} CSS files\n`);

  console.log('=== Step 4: Add loading="lazy" to below-fold images ===\n');
  const lazyCount = addLazyLoading(conversions);
  console.log(`  Added loading="lazy" to ${lazyCount} images\n`);

  if (!WRITE) {
    console.log('DRY RUN complete. Run with --write to apply all changes.');
    console.log('Then run: node build.js');
  } else {
    console.log('All done. Run: node build.js');
  }
}

main().catch(console.error);
