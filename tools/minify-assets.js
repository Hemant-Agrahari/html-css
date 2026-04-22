#!/usr/bin/env node
/**
 * Minifies CSS (clean-css) and JS (terser) files in dist/
 */

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function findFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

async function main() {
  console.log('\nAsset Minification:');

  // Minify CSS
  const cssFiles = findFiles(path.join(DIST_DIR, 'css'), '.css');
  let cssSaved = 0;
  const cleanCss = new CleanCSS({ level: 2 });

  for (const file of cssFiles) {
    const original = fs.readFileSync(file, 'utf-8');
    const result = cleanCss.minify(original);
    if (result.errors.length === 0 && result.styles.length < original.length) {
      const saved = original.length - result.styles.length;
      cssSaved += saved;
      fs.writeFileSync(file, result.styles);
      console.log(`  CSS: ${path.relative(DIST_DIR, file)} ${(original.length/1024).toFixed(0)}KB → ${(result.styles.length/1024).toFixed(0)}KB`);
    }
  }

  // Minify JS
  const jsFiles = findFiles(path.join(DIST_DIR, 'js'), '.js');
  let jsSaved = 0;

  for (const file of jsFiles) {
    // Skip JSON files and already-minified files
    if (file.endsWith('.json') || file.endsWith('.min.js')) continue;

    const original = fs.readFileSync(file, 'utf-8');
    try {
      const result = await minify(original, {
        compress: { drop_console: false, passes: 2 },
        mangle: true,
      });
      if (result.code && result.code.length < original.length) {
        const saved = original.length - result.code.length;
        jsSaved += saved;
        fs.writeFileSync(file, result.code);
        console.log(`  JS:  ${path.relative(DIST_DIR, file)} ${(original.length/1024).toFixed(0)}KB → ${(result.code.length/1024).toFixed(0)}KB`);
      }
    } catch (err) {
      console.error(`  JS ERROR: ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log(`\nCSS saved: ${(cssSaved/1024).toFixed(0)}KB | JS saved: ${(jsSaved/1024).toFixed(0)}KB`);
}

main().catch(console.error);
