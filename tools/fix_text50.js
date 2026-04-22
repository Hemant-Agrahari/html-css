const fs = require("fs");
const glob = require("glob");
const cheerio = require("cheerio");

const files = glob.sync("pages/*/content.html");
let fixedCount = 0;
files.forEach((file) => {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes('class="text50"')) {
    // Find the inner div of signs-of-a-slab-leak-parent and add text50
    html = html.replace(
      /<div class="signs-of-a-slab-leak-parent">\s*<div>/g,
      '<div class="signs-of-a-slab-leak-parent">\n                  <div class="text50">',
    );
    fs.writeFileSync(file, html);
    fixedCount++;
  }
});
console.log("Fixed pages:", fixedCount);
