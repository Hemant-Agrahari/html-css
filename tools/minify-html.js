#!/usr/bin/env node
/**
 * Minifies all HTML files in dist/ — removes whitespace, comments
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function minifyHTML(html) {
  return html
    // Remove HTML comments (but keep conditional comments and ld+json)
    .replace(/<!--(?!\[)(?!.*ld\+json)[\s\S]*?-->/g, '')
    // Collapse multiple whitespace to single space
    .replace(/\s{2,}/g, ' ')
    // Remove whitespace between tags
    .replace(/>\s+</g, '><')
    // Remove leading/trailing whitespace
    .trim();
}

const htmlFiles = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html'));
let totalSaved = 0;

console.log('\nHTML Minification:');
for (const file of htmlFiles) {
  const fp = path.join(DIST_DIR, file);
  const original = fs.readFileSync(fp, 'utf-8');
  const minified = minifyHTML(original);
  const saved = original.length - minified.length;
  totalSaved += saved;
  fs.writeFileSync(fp, minified);
  if (saved > 1000) {
    console.log(`  ${file}: ${(original.length/1024).toFixed(0)}KB → ${(minified.length/1024).toFixed(0)}KB (${(saved/1024).toFixed(0)}KB saved)`);
  }
}
console.log(`Total saved: ${(totalSaved/1024).toFixed(0)}KB`);
