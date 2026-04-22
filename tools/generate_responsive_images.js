/**
 * generate_responsive_images.js
 * Uses Sharp to generate -375w and -768w versions of large assets.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IMG_DIR = path.join(__dirname, "../assets/images");
const GEN_DIR = path.join(IMG_DIR, "generated");

if (!fs.existsSync(GEN_DIR)) {
  fs.mkdirSync(GEN_DIR, { recursive: true });
}

const SIZES = [375, 768];

async function processImages() {
  const files = fs
    .readdirSync(IMG_DIR)
    .filter((f) => f.match(/\.(webp|jpg|png)$/));
  console.log(`🖼️ Processing ${files.length} images...`);

  for (const file of files) {
    const filePath = path.join(IMG_DIR, file);
    const metadata = await sharp(filePath).metadata();

    if (metadata.width >= 400) {
      console.log(`📏 Processing ${file} (${metadata.width}px wide)`);

      for (const size of SIZES) {
        if (metadata.width > size) {
          const ext = "webp";
          const name = path.parse(file).name;
          const outputName = `${name}-${size}w.${ext}`;
          const outputPath = path.join(GEN_DIR, outputName);

          if (!fs.existsSync(outputPath)) {
            await sharp(filePath)
              .resize(size)
              .webp({ quality: 80 })
              .toFile(outputPath);
            // console.log(`   ✅ Generated ${outputName}`);
          }
        }
      }
    }
  }
  console.log("✨ Responsive images generated in assets/images/generated/");
}

processImages().catch(console.error);
