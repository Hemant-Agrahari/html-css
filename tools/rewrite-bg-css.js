#!/usr/bin/env node
/**
 * Rewrite CSS background-image URLs from .png/.webp → .webp where a smaller WebP exists.
 *
 * Operates on:
 *   shared/css/vendor/*.css
 *   shared/css/global.css
 *
 * (Per-page purged.css and critical.css are regenerated from these sources.)
 *
 * Idempotent: only rewrites if a smaller WebP variant exists.
 *
 * Usage:
 *   node tools/rewrite-bg-css.js              # rewrite
 *   node tools/rewrite-bg-css.js --dry-run    # preview
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_FILES = [];
function walk(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f));
  else if (p.endsWith('.css')) CSS_FILES.push(p);
}
walk(path.join(ROOT, 'shared/css/vendor'));
walk(path.join(ROOT, 'shared/css/global.css'));

const DRY_RUN = process.argv.includes('--dry-run');

// Determine which URLs have a smaller WebP available
function hasSmallWebP(url) {
  if (!/\.(png|jpg|jpeg)$/i.test(url)) return false;
  const fsPath = url.startsWith('/') ? path.join(ROOT, 'shared', url) : null;
  if (!fsPath || !fs.existsSync(fsPath)) return false;
  const webpPath = fsPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  if (!fs.existsSync(webpPath)) return false;
  return fs.statSync(webpPath).size < fs.statSync(fsPath).size;
}

let totalRewrites = 0;
const filesChanged = [];

for (const file of CSS_FILES) {
  const orig = fs.readFileSync(file, 'utf-8');
  let changed = orig;
  let count = 0;

  // Match url(...) inside background-image declarations only
  changed = changed.replace(/(background(?:-image)?\s*:[^;}]*?url\(\s*['"]?)([^'")]+\.(?:png|jpg|jpeg))(['"]?\s*\))/gi,
    (match, prefix, url, suffix) => {
      if (!hasSmallWebP(url)) return match;
      const webpUrl = url.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      count++;
      return prefix + webpUrl + suffix;
    });

  if (count > 0) {
    filesChanged.push({ file: path.relative(ROOT, file), count });
    totalRewrites += count;
    if (!DRY_RUN) fs.writeFileSync(file, changed, 'utf-8');
  }
}

console.log(`=== ${DRY_RUN ? 'DRY RUN — would rewrite' : 'Rewrote'} ${totalRewrites} url() refs in ${filesChanged.length} files ===\n`);
filesChanged.forEach(f => console.log(`  ${f.count.toString().padStart(3)}× ${f.file}`));
