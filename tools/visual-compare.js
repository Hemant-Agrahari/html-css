#!/usr/bin/env node
/**
 * Visual Compare — Pixel-diff before/ vs after/ screenshots.
 * Uses sharp to compare images and output diff percentage.
 * Threshold: < 0.1% difference = PASS
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BEFORE_DIR = path.join(SCREENSHOTS_DIR, 'before');
const AFTER_DIR = path.join(SCREENSHOTS_DIR, 'after');
const DIFF_DIR = path.join(SCREENSHOTS_DIR, 'diff');
const THRESHOLD = 0.1; // max allowed difference in %

async function compareImages(beforePath, afterPath, diffPath) {
  const beforeImg = sharp(beforePath);
  const afterImg = sharp(afterPath);

  const beforeMeta = await beforeImg.metadata();
  const afterMeta = await afterImg.metadata();

  // Resize to same dimensions if needed (page height may vary slightly)
  const width = Math.min(beforeMeta.width, afterMeta.width);
  const height = Math.min(beforeMeta.height, afterMeta.height);

  const beforeBuf = await sharp(beforePath)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .raw()
    .toBuffer();

  const afterBuf = await sharp(afterPath)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .raw()
    .toBuffer();

  // Pixel-by-pixel comparison
  let diffPixels = 0;
  const totalPixels = width * height;
  const diffData = Buffer.alloc(beforeBuf.length);

  for (let i = 0; i < beforeBuf.length; i += 3) {
    const rDiff = Math.abs(beforeBuf[i] - afterBuf[i]);
    const gDiff = Math.abs(beforeBuf[i + 1] - afterBuf[i + 1]);
    const bDiff = Math.abs(beforeBuf[i + 2] - afterBuf[i + 2]);

    if (rDiff > 2 || gDiff > 2 || bDiff > 2) {
      // Pixel differs — mark red in diff image
      diffPixels++;
      diffData[i] = 255;     // R
      diffData[i + 1] = 0;   // G
      diffData[i + 2] = 0;   // B
    } else {
      // Same — dim version of original
      diffData[i] = Math.floor(beforeBuf[i] * 0.3);
      diffData[i + 1] = Math.floor(beforeBuf[i + 1] * 0.3);
      diffData[i + 2] = Math.floor(beforeBuf[i + 2] * 0.3);
    }
  }

  const diffPercent = (diffPixels / totalPixels) * 100;

  // Save diff image if there are differences
  if (diffPercent > 0) {
    await sharp(diffData, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(diffPath);
  }

  return { diffPercent, diffPixels, totalPixels, width, height };
}

async function main() {
  fs.mkdirSync(DIFF_DIR, { recursive: true });

  if (!fs.existsSync(BEFORE_DIR) || !fs.existsSync(AFTER_DIR)) {
    console.error('Missing before/ or after/ directory. Run visual-test.js first.');
    process.exit(1);
  }

  const beforeFiles = fs.readdirSync(BEFORE_DIR).filter(f => f.endsWith('.webp'));
  const afterFiles = fs.readdirSync(AFTER_DIR).filter(f => f.endsWith('.webp'));

  console.log(`\nVisual Comparison`);
  console.log(`Before: ${beforeFiles.length} screenshots`);
  console.log(`After: ${afterFiles.length} screenshots`);
  console.log(`Threshold: ${THRESHOLD}%\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const file of beforeFiles) {
    if (!afterFiles.includes(file)) {
      console.log(`  SKIP: ${file} — no after screenshot`);
      continue;
    }

    try {
      const result = await compareImages(
        path.join(BEFORE_DIR, file),
        path.join(AFTER_DIR, file),
        path.join(DIFF_DIR, file)
      );

      if (result.diffPercent <= THRESHOLD) {
        console.log(`  PASS: ${file} (${result.diffPercent.toFixed(3)}%)`);
        passed++;
      } else {
        console.log(`  FAIL: ${file} (${result.diffPercent.toFixed(3)}% — ${result.diffPixels} pixels differ)`);
        failed++;
        failures.push({ file, ...result });
      }
    } catch (err) {
      console.log(`  ERROR: ${file} — ${err.message.substring(0, 60)}`);
      failed++;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\nFailed pages:`);
    failures.forEach(f => console.log(`  ${f.file}: ${f.diffPercent.toFixed(3)}% (${f.diffPixels} px)`));
    console.log(`\nDiff images saved to: ${DIFF_DIR}`);
    process.exit(1);
  } else {
    console.log(`\nAll pages match — safe to proceed.`);
  }
}

main().catch(console.error);
