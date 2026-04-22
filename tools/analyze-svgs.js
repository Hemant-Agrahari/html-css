const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'shared', 'assets', 'images');

function findLargeSvgs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findLargeSvgs(full));
    else if (entry.name.endsWith('.svg')) {
      const stat = fs.statSync(full);
      if (stat.size > 500 * 1024) {
        const content = fs.readFileSync(full, 'utf-8');
        const hasEmbed = /data:image\/(png|jpeg|jpg);base64/.test(content);
        const w = content.match(/width="(\d+)"/)?.[1];
        const h = content.match(/height="(\d+)"/)?.[1];
        results.push({ path: full, size: stat.size, hasEmbed, svgW: w, svgH: h, name: entry.name });
      }
    }
  }
  return results;
}

const svgs = findLargeSvgs(assetsDir);
console.log('Large SVGs with embedded raster:', svgs.filter(s => s.hasEmbed).length);
console.log('Large SVGs without embedded raster:', svgs.filter(s => !s.hasEmbed).length);
for (const s of svgs) {
  console.log(`  ${(s.size/1024/1024).toFixed(1)}MB ${s.svgW}x${s.svgH} embed=${s.hasEmbed} ${s.name}`);
}
