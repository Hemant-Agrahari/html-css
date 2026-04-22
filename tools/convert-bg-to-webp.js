#!/usr/bin/env node
/**
 * Convert PNG/JPG files referenced in CSS background-image declarations to WebP.
 *
 * Reads CSS sources, finds background-image: url(...) refs, and for each PNG/JPG file >= 30KB:
 *   1. Generates a WebP at the same dimensions
 *   2. Reports the size savings
 *
 * Original PNG/JPG files are left in place (CSS rewrite happens in Phase B2).
 *
 * Usage:
 *   node tools/convert-bg-to-webp.js              # convert all
 *   node tools/convert-bg-to-webp.js --dry-run    # preview
 *   node tools/convert-bg-to-webp.js --min-kb=10  # threshold
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_DIRS = [
  path.join(ROOT, 'shared/css/pages'),
  path.join(ROOT, 'shared/css/vendor'),
  path.join(ROOT, 'shared/css/global.css'),
];
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MIN_KB = +(args.find(a => a.startsWith('--min-kb='))?.split('=')[1] ?? 30);

function walk(p, out = []) {
  if (!fs.existsSync(p)) return out;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const f of fs.readdirSync(p)) walk(path.join(p, f), out);
  } else if (p.endsWith('.css')) {
    out.push(p);
  }
  return out;
}

function findBgUrls() {
  const cssFiles = CSS_DIRS.flatMap(d => walk(d));
  const urls = new Set();
  for (const f of cssFiles) {
    const content = fs.readFileSync(f, 'utf-8');
    const re = /background(?:-image)?\s*:[^;}]*?url\(\s*['"]?([^'")]+\.(?:png|jpg|jpeg))['"]?\s*\)/gi;
    let m;
    while ((m = re.exec(content)) !== null) urls.add(m[1]);
  }
  return [...urls];
}

async function convert(url) {
  const fsPath = url.startsWith('/') ? path.join(ROOT, 'shared', url) : path.join(ROOT, url);
  if (!fs.existsSync(fsPath)) return { url, status: 'MISSING' };
  const stat = fs.statSync(fsPath);
  const sizeKB = stat.size / 1024;
  if (sizeKB < MIN_KB) return { url, status: 'TOO_SMALL', sizeKB };

  const webpPath = fsPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  if (fs.existsSync(webpPath)) return { url, status: 'EXISTS', sizeKB };

  if (DRY_RUN) return { url, status: 'WOULD_CONVERT', sizeKB };

  try {
    const meta = await sharp(fsPath).metadata();
    const hasAlpha = meta.hasAlpha || /\.png$/i.test(fsPath);
    await sharp(fsPath)
      .webp({ quality: 80, effort: 4, alphaQuality: 90 })
      .toFile(webpPath);
    const newKB = fs.statSync(webpPath).size / 1024;
    return { url, status: 'CONVERTED', sizeKB, newKB, savedKB: sizeKB - newKB, hasAlpha };
  } catch (e) {
    return { url, status: 'ERROR', sizeKB, err: e.message };
  }
}

(async () => {
  const urls = findBgUrls();
  console.log(`Found ${urls.length} unique PNG/JPG background-image URLs in CSS`);
  console.log(`Threshold: ${MIN_KB} KB${DRY_RUN ? '  (DRY RUN)' : ''}\n`);

  const results = [];
  for (const url of urls) {
    const r = await convert(url);
    results.push(r);
  }

  const converted = results.filter(r => r.status === 'CONVERTED' || r.status === 'WOULD_CONVERT');
  const exists = results.filter(r => r.status === 'EXISTS');
  const tooSmall = results.filter(r => r.status === 'TOO_SMALL');
  const missing = results.filter(r => r.status === 'MISSING');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log(`=== ${converted.length} converted ===`);
  let totalOrig = 0, totalNew = 0;
  converted.sort((a, b) => b.sizeKB - a.sizeKB).forEach(r => {
    totalOrig += r.sizeKB;
    totalNew += r.newKB || 0;
    const pct = r.newKB ? ((1 - r.newKB / r.sizeKB) * 100).toFixed(0) + '%' : '';
    console.log(`  ${r.sizeKB.toFixed(0).padStart(5)} KB → ${(r.newKB || 0).toFixed(0).padStart(5)} KB  (-${pct.padStart(3)})  ${r.url}`);
  });

  console.log(`\nTotal original: ${totalOrig.toFixed(0)} KB`);
  console.log(`Total WebP:     ${totalNew.toFixed(0)} KB`);
  console.log(`Saved:          ${(totalOrig - totalNew).toFixed(0)} KB (${((1 - totalNew / totalOrig) * 100).toFixed(0)}%)`);

  if (exists.length) console.log(`\nSkipped — WebP already exists: ${exists.length}`);
  if (tooSmall.length) console.log(`Skipped — under ${MIN_KB} KB threshold: ${tooSmall.length}`);
  if (missing.length) {
    console.log(`\nMISSING (404s in CSS): ${missing.length}`);
    missing.forEach(r => console.log(`  ${r.url}`));
  }
  if (errors.length) {
    console.log(`\nERRORS: ${errors.length}`);
    errors.forEach(r => console.log(`  ${r.url}: ${r.err}`));
  }
})();
