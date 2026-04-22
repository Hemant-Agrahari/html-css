#!/usr/bin/env node
/**
 * Generate responsive WebP variants for product images.
 *
 * For each source image >= 768px wide, produces 4 variants:
 *   {name}-360.webp, {name}-768.webp, {name}-1280.webp, {name}-1920.webp
 *
 * Idempotent: skips variants that already exist.
 * Skips files that are already variants (match -{w}.webp pattern).
 * Doesn't upscale: only generates variants smaller than source width.
 *
 * Outputs tools/image-variants.json — manifest of which variants exist per source.
 *
 * Usage:
 *   node tools/generate-image-variants.js                   # all dirs
 *   node tools/generate-image-variants.js --dry-run         # show what would be generated
 *   node tools/generate-image-variants.js --force           # regenerate even if exists
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT, 'shared/assets/product_images'),
  path.join(ROOT, 'shared/assets/images'),
];
const TARGET_WIDTHS = [360, 768, 1280, 1920];
const MIN_SOURCE_WIDTH = 768;
const VARIANT_RX = /-(360|768|1280|1920)\.webp$/i;
const MANIFEST_PATH = path.join(__dirname, 'image-variants.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.webp$/i.test(e.name) && !VARIANT_RX.test(e.name)) out.push(p);
  }
  return out;
}

async function processFile(srcPath) {
  const meta = await sharp(srcPath).metadata();
  if (!meta.width || meta.width < MIN_SOURCE_WIDTH) return { skipped: 'too-small', width: meta.width };

  const dir = path.dirname(srcPath);
  const ext = path.extname(srcPath);
  const base = path.basename(srcPath, ext);
  const generated = [];
  const existed = [];
  const variantsForManifest = {};

  for (const w of TARGET_WIDTHS) {
    if (w >= meta.width) continue; // don't upscale
    const variantName = `${base}-${w}${ext}`;
    const variantPath = path.join(dir, variantName);

    if (fs.existsSync(variantPath) && !FORCE) {
      existed.push(w);
      variantsForManifest[w] = variantName;
      continue;
    }

    if (DRY_RUN) {
      generated.push(w);
      variantsForManifest[w] = variantName;
      continue;
    }

    await sharp(srcPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(variantPath);
    generated.push(w);
    variantsForManifest[w] = variantName;
  }

  return { width: meta.width, generated, existed, variantsForManifest };
}

async function main() {
  const sources = SCAN_DIRS.flatMap(d => walk(d));
  console.log(`Scanning ${sources.length} source images...\n`);

  const manifest = {};
  let totalGenerated = 0;
  let totalExisted = 0;
  let totalSkipped = 0;
  const errors = [];

  for (const src of sources) {
    try {
      const r = await processFile(src);
      const relPath = path.relative(ROOT, src).replace(/\\/g, '/');
      if (r.skipped) {
        totalSkipped++;
        if (sources.length < 30) console.log(`  SKIP ${r.skipped} (${r.width}px) ${relPath}`);
      } else {
        manifest[relPath] = {
          sourceWidth: r.width,
          variants: r.variantsForManifest,
        };
        totalGenerated += r.generated.length;
        totalExisted += r.existed.length;
        if (r.generated.length > 0) {
          console.log(`  GEN  ${relPath} (${r.width}px) → [${r.generated.join(', ')}]`);
        }
      }
    } catch (e) {
      errors.push({ src, err: e.message });
      console.error(`  ERR  ${src}: ${e.message}`);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest: ${MANIFEST_PATH} (${Object.keys(manifest).length} entries)`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Sources scanned:       ${sources.length}`);
  console.log(`Skipped (too small):   ${totalSkipped}`);
  console.log(`Variants generated:    ${totalGenerated}${DRY_RUN ? ' (dry run)' : ''}`);
  console.log(`Variants already exist:${totalExisted}`);
  if (errors.length) console.log(`Errors:                ${errors.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
