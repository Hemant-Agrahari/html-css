#!/usr/bin/env node
/**
 * Converts fake SVGs (SVG wrappers around base64-encoded PNG/JPEG) to WebP.
 * These inflate every page that references them by 1-19MB per image.
 *
 * Strategy:
 *  - Extract base64 image data from SVG
 *  - Decode and convert to WebP via sharp
 *  - Output at 2× the declared SVG dimensions (retina quality), capped at 2× original
 *  - Save .webp alongside the SVG (same dir, same base name)
 *
 * Usage:
 *   node tools/convert-embedded-svgs.js          # dry run (show what would change)
 *   node tools/convert-embedded-svgs.js --write  # write .webp files
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'shared', 'assets', 'images');
const DRY_RUN = !process.argv.includes('--write');

if (DRY_RUN) console.log('[DRY RUN] Pass --write to actually create WebP files\n');

async function findLargeSvgs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await findLargeSvgs(full));
    else if (entry.name.endsWith('.svg')) {
      const stat = fs.statSync(full);
      if (stat.size > 500 * 1024) {
        const content = fs.readFileSync(full, 'utf-8');
        const match = content.match(/data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)/);
        if (match) {
          const imgType = match[1];
          const b64 = match[2].replace(/\s/g, '');
          const w = parseInt(content.match(/width="(\d+)"/)?.[1] || '0');
          const h = parseInt(content.match(/height="(\d+)"/)?.[1] || '0');
          results.push({ path: full, size: stat.size, imgType, b64, svgW: w, svgH: h, name: entry.name });
        }
      }
    }
  }
  return results;
}

async function main() {
  const svgs = await findLargeSvgs(ASSETS);
  console.log(`Found ${svgs.length} fake SVGs with embedded raster data\n`);

  let totalOriginal = 0;
  let totalWebp = 0;

  for (const s of svgs) {
    const webpName = s.name.replace(/\.svg$/i, '.webp');
    const webpPath = path.join(path.dirname(s.path), webpName);

    // Output at 2× SVG declared dims for retina, but don't upscale beyond the encoded image
    const targetW = Math.min(s.svgW * 2, 2400);
    const targetH = Math.min(s.svgH * 2, 2400);

    let webpSize = 0;
    if (!DRY_RUN) {
      try {
        const buf = Buffer.from(s.b64, 'base64');
        const img = sharp(buf);
        const meta = await img.metadata();
        const outW = Math.min(targetW, meta.width || targetW);
        const outH = Math.min(targetH, meta.height || targetH);

        await img
          .resize(outW, outH, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 6 })
          .toFile(webpPath);

        webpSize = fs.statSync(webpPath).size;
      } catch (e) {
        console.error(`  ERROR ${s.name}: ${e.message}`);
        continue;
      }
    } else {
      // Estimate: WebP is typically 30-50% of PNG at same dimensions, but we're also resizing
      // Rough estimate: (targetW * targetH) / (original_px * original_px) * original_size * 0.35
      webpSize = Math.round(s.size * 0.03); // very rough: ~97% reduction expected
    }

    const savingPct = ((1 - webpSize / s.size) * 100).toFixed(1);
    const savingMB = ((s.size - webpSize) / 1024 / 1024).toFixed(2);
    console.log(
      `  ${(s.size / 1024 / 1024).toFixed(1)}MB → ${(webpSize / 1024).toFixed(0)}KB ` +
      `(-${savingPct}%, -${savingMB}MB) ${s.name} [${s.svgW}×${s.svgH} → ${targetW}×${targetH}]`
    );

    totalOriginal += s.size;
    totalWebp += webpSize;
  }

  console.log(`\nTotal: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB → ${(totalWebp / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Savings: ${((totalOriginal - totalWebp) / 1024 / 1024).toFixed(1)}MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(1)}%)`);

  if (DRY_RUN) {
    console.log('\nRun with --write to create .webp files');
  } else {
    console.log('\nWebP files written. Now update HTML references and run build.js');
    console.log('To update: node tools/convert-embedded-svgs.js --update-refs');
  }
}

main().catch(console.error);
