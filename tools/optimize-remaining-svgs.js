#!/usr/bin/env node
/**
 * Optimizes remaining large SVGs (>100KB) that are pure vector (no embedded raster).
 * Converts them to high-quality WebP using sharp and updates HTML references.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const MIN_SIZE = 100 * 1024;

async function findLargeSvgs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await findLargeSvgs(full));
    else if (entry.name.endsWith('.svg') && !fs.existsSync(full.replace('.svg', '.webp'))) {
      const stat = fs.statSync(full);
      if (stat.size > MIN_SIZE) results.push(full);
    }
  }
  return results;
}

async function convertSvg(svgPath) {
  const svg = fs.readFileSync(svgPath);

  // Get SVG dimensions
  try {
    const meta = await sharp(svg, { density: 300 }).metadata();
    const width = Math.min(meta.width || 600, 1200);
    const height = Math.min(meta.height || 600, 1200);

    const webp = await sharp(svg, { density: 300 })
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const webpPath = svgPath.replace('.svg', '.webp');
    fs.writeFileSync(webpPath, webp);
    return { svg: svgPath, webp: webpPath, origSize: fs.statSync(svgPath).size, newSize: webp.length };
  } catch (err) {
    return null;
  }
}

async function main() {
  const imagesDir = path.join(DIST_DIR, 'assets', 'images');
  const svgs = await findLargeSvgs(imagesDir);
  console.log(`\nOptimizing ${svgs.length} remaining large SVGs (>100KB, no WebP yet)`);

  const mapping = {};
  let totalOrig = 0, totalNew = 0;

  for (const svgPath of svgs) {
    const result = await convertSvg(svgPath);
    if (result) {
      totalOrig += result.origSize;
      totalNew += result.newSize;
      const relSvg = '/' + path.relative(DIST_DIR, result.svg).replace(/\\/g, '/');
      const relWebp = '/' + path.relative(DIST_DIR, result.webp).replace(/\\/g, '/');
      mapping[relSvg] = relWebp;
      console.log(`  ${path.basename(svgPath)}: ${(result.origSize/1024).toFixed(0)}KB → ${(result.newSize/1024).toFixed(0)}KB`);
    }
  }

  console.log(`\nTotal: ${(totalOrig/1024/1024).toFixed(1)}MB → ${(totalNew/1024/1024).toFixed(1)}MB`);

  // Rewrite HTML references
  const htmlFiles = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html')).map(f => path.join(DIST_DIR, f));
  let rewriteCount = 0;
  for (const htmlFile of htmlFiles) {
    let html = fs.readFileSync(htmlFile, 'utf-8');
    let changed = false;
    for (const [svgRef, webpRef] of Object.entries(mapping)) {
      const escaped = svgRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(src=["'])${escaped}(["'])`, 'g');
      if (regex.test(html)) {
        html = html.replace(regex, `$1${webpRef}$2`);
        changed = true;
      }
    }
    if (changed) { fs.writeFileSync(htmlFile, html); rewriteCount++; }
  }
  console.log(`Rewrote ${rewriteCount} HTML files`);
}

main().catch(console.error);
