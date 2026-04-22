/**
 * purge_css.js
 * Purges unused CSS from the massive static files.
 * Uses a safe discovery method and a master safelist.
 */
const { PurgeCSS } = require("purgecss");
const fs = require("fs");
const path = require("path");
const safelist = require("./css-safelist");

const CSS_DIR = path.join(__dirname, "../assets/css");
const DIST_DIR = path.join(__dirname, "../dist");
const OUTPUT_DIR = path.join(__dirname, "../assets/css/purged");

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runPurge() {
  console.log("🚀 Starting Safe CSS Purge...");

  const content = [
    path.join(DIST_DIR, "**/*.html"),
    path.join(__dirname, "../shared/**/*.html"),
    path.join(__dirname, "../shared/**/*.js"),
  ];

  const cssFiles = fs
    .readdirSync(CSS_DIR)
    .filter((f) => f.endsWith(".css") && !f.includes("purged"))
    .map((f) => path.join(CSS_DIR, f));

  console.log(`🔍 Analyzing ${cssFiles.length} CSS files...`);

  try {
    const purgecssResult = await new PurgeCSS().purge({
      content: content,
      css: cssFiles,
      safelist: {
        standard: safelist.standard,
        deep: safelist.deep,
        greedy: safelist.greedy,
      },
      // Important for responsive designs
      keyframes: true,
      variables: true,
      rejected: true, // We will log what was removed for audit
    });

    for (const result of purgecssResult) {
      const fileName = path.basename(result.file);
      const outputPath = path.join(OUTPUT_DIR, `purged-${fileName}`);
      fs.writeFileSync(outputPath, result.css);

      const originalSize = fs.statSync(result.file).size / 1024;
      const newSize = result.css.length / 1024;
      const reduction = (
        ((originalSize - newSize) / originalSize) *
        100
      ).toFixed(2);

      console.log(
        `✅ ${fileName}: ${originalSize.toFixed(2)}KB -> ${newSize.toFixed(2)}KB (${reduction}% reduction)`,
      );

      if (result.rejected && result.rejected.length > 0) {
        // console.log(`🗑️ Removed ${result.rejected.length} unused classes.`);
      }
    }

    console.log("\n✨ Purged files are ready in assets/css/purged/");
    console.log("⚠️ Next Step: Update build.js to use these optimized files.");
  } catch (err) {
    console.error("❌ PurgeCSS failed:", err);
  }
}

runPurge();
