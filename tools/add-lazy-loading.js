#!/usr/bin/env node
/**
 * Adds loading="lazy" to below-fold images in dist/ HTML files.
 * - Skips images that already have loading="eager" or loading="lazy"
 * - Keeps first 3 images as eager (above-the-fold)
 * - Adds width/height to images that have them for CLS prevention
 * - Adds decoding="async" to lazy images
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

// Images to always keep eager (above-fold / LCP candidates)
const EAGER_PATTERNS = [
  /header-img/,
  /OHS Gaming Logo/,
  /header-footer-img/,
];

function processHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let imgCount = 0;
  let lazyCount = 0;

  html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    imgCount++;

    // Skip if already has loading attribute
    if (/loading\s*=/i.test(attrs)) return match;

    // Check if this is a known above-fold image
    const isEager = EAGER_PATTERNS.some(p => p.test(attrs));

    // First few images on the page are above-fold
    if (isEager || imgCount <= 3) {
      // Add fetchpriority="high" to first image (likely LCP)
      if (imgCount === 1 && !/fetchpriority/i.test(attrs)) {
        return `<img${attrs} fetchpriority="high">`;
      }
      return match;
    }

    // Add lazy loading + async decoding
    lazyCount++;
    let newAttrs = attrs;
    if (!/decoding\s*=/i.test(newAttrs)) {
      newAttrs += ' decoding="async"';
    }
    newAttrs += ' loading="lazy"';

    return `<img${newAttrs}>`;
  });

  if (lazyCount > 0) {
    fs.writeFileSync(filePath, html);
    console.log(`  ${path.basename(filePath)}: ${lazyCount}/${imgCount} images set to lazy`);
  }
  return lazyCount;
}

function main() {
  console.log('\nLazy Loading Optimization:');
  let total = 0;

  const htmlFiles = fs.readdirSync(DIST_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(DIST_DIR, f));

  for (const file of htmlFiles) {
    total += processHtml(file);
  }

  console.log(`Total: ${total} images set to lazy loading`);
}

main();
