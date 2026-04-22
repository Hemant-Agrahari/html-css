#!/usr/bin/env node
/**
 * Converts large SVGs (with embedded raster data) to WebP in dist/
 * - Extracts base64 PNG/JPEG from SVG
 * - Resizes to 3x display size for retina quality
 * - Converts to WebP at quality 85
 * - Writes .webp next to original .svg in dist/
 * - Returns mapping of old→new paths for HTML rewriting
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const MIN_SIZE = 500 * 1024; // 500KB threshold
const WEBP_QUALITY = 85;
const RETINA_MULTIPLIER = 3; // 3x for crisp retina

async function findLargeSvgs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findLargeSvgs(full));
    } else if (entry.name.endsWith('.svg')) {
      const stat = fs.statSync(full);
      if (stat.size > MIN_SIZE) {
        results.push(full);
      }
    }
  }
  return results;
}

async function convertSvgToWebp(svgPath) {
  const content = fs.readFileSync(svgPath, 'utf-8');

  // Check for embedded raster data
  const match = content.match(/data:image\/(png|jpeg|jpg);base64,([^"]+)"/);
  if (!match) return null;

  const b64 = match[2];
  const buf = Buffer.from(b64, 'base64');

  // Get SVG display dimensions
  const wMatch = content.match(/width="(\d+)"/);
  const hMatch = content.match(/height="(\d+)"/);
  const svgW = parseInt(wMatch?.[1] || '120');
  const svgH = parseInt(hMatch?.[1] || '120');

  // Target size: 3x display for retina, capped at original image size
  const meta = await sharp(buf).metadata();
  const targetW = Math.min(svgW * RETINA_MULTIPLIER, meta.width);
  const targetH = Math.min(svgH * RETINA_MULTIPLIER, meta.height);

  // Convert to WebP
  const webpBuf = await sharp(buf)
    .resize(targetW, targetH, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Write WebP file alongside SVG
  const webpPath = svgPath.replace(/\.svg$/, '.webp');
  fs.writeFileSync(webpPath, webpBuf);

  const savings = ((1 - webpBuf.length / fs.statSync(svgPath).size) * 100).toFixed(1);
  return {
    svg: svgPath,
    webp: webpPath,
    originalSize: fs.statSync(svgPath).size,
    newSize: webpBuf.length,
    savings
  };
}

async function main() {
  const imagesDir = path.join(DIST_DIR, 'assets', 'images');
  const svgs = await findLargeSvgs(imagesDir);

  console.log(`\nImage Optimization: ${svgs.length} large SVGs found`);

  let totalOriginal = 0;
  let totalNew = 0;
  const mapping = {}; // /assets/images/foo.svg → /assets/images/foo.webp

  for (const svgPath of svgs) {
    try {
      const result = await convertSvgToWebp(svgPath);
      if (result) {
        totalOriginal += result.originalSize;
        totalNew += result.newSize;
        const relSvg = '/' + path.relative(DIST_DIR, result.svg).replace(/\\/g, '/');
        const relWebp = '/' + path.relative(DIST_DIR, result.webp).replace(/\\/g, '/');
        mapping[relSvg] = relWebp;
        console.log(`  ${path.basename(svgPath)}: ${(result.originalSize/1024/1024).toFixed(1)}MB → ${(result.newSize/1024).toFixed(0)}KB (${result.savings}% saved)`);
      }
    } catch (err) {
      console.error(`  ERROR: ${path.basename(svgPath)}: ${err.message}`);
    }
  }

  console.log(`\nTotal: ${(totalOriginal/1024/1024).toFixed(1)}MB → ${(totalNew/1024/1024).toFixed(1)}MB`);

  // Now rewrite all HTML files in dist/ to use WebP instead of SVG
  const htmlFiles = [];
  function findHtml(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) findHtml(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  findHtml(DIST_DIR);

  let rewriteCount = 0;
  for (const htmlFile of htmlFiles) {
    let html = fs.readFileSync(htmlFile, 'utf-8');
    let changed = false;
    for (const [svgRef, webpRef] of Object.entries(mapping)) {
      // Replace in img src attributes only (not in inline SVG or other contexts)
      // Match both quoted forms: src="/path/file.svg" and src='/path/file.svg'
      const escaped = svgRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(src=["'])${escaped}(["'])`, 'g');
      if (regex.test(html)) {
        html = html.replace(regex, `$1${webpRef}$2`);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(htmlFile, html);
      rewriteCount++;
    }
  }
  console.log(`Rewrote ${rewriteCount} HTML files with WebP references`);

  return mapping;
}

main().catch(console.error);
