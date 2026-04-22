const fs = require("fs");
const path = require("path");

const pagesDir = path.join(__dirname, "../pages");

const styleBlock = `
/* =====================
   Article Body Text (Auto-Sync)
   ===================== */
.text50 {
    font-family: 'Outfit', sans-serif !important;
    font-size: 16px;
    line-height: 140%;
    color: #6e6e6e;
    align-self: stretch;
    position: relative;
}

.text50 ul.custm-ul {
    padding-left: 0 !important;
    margin-block: 16px;
    list-style: none !important;
}

.text50 ul.custm-ul li {
    position: relative;
    color: #333;
    line-height: 1.6;
    padding-left: 25px;
    margin-bottom: 12px;
}

.text50 ul.custm-ul li::after {
    content: "";
    width: 8px;
    height: 8px;
    background: #3ab54b;
    position: absolute;
    border-radius: 50%;
    left: 0;
    top: 9px;
}

.text50 h2.blog_sandiego_title,
.text50 h1, .text50 h2, .text50 h3 {
    font-family: 'Outfit', sans-serif !important;
    color: #2c2e47;
    margin-top: 24px;
    margin-bottom: 12px;
    font-weight: 600;
}

.text50 p {
    margin-bottom: 16px;
}

.text50 a {
    color: #3bb44d;
    text-decoration: none;
}

.text50 a:hover {
    text-decoration: underline;
}
`;

function syncCss(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Check if the style block is already present
  if (content.includes(".text50") && content.includes("Outfit")) {
    // Already fixed or partially fixed, we'll replace the text50 block to be sure
    const regex =
      /\/\* =+ Article Body Text [\s\S]*?\*\/\s*\.text50 [\s\S]*?(\n\s*\.text50 a:hover \{[\s\S]*?\})/g;
    // This is tricky, let's just append or replace a simpler way.
    // If it starts with our comment, we replace it.
  }

  // To be safe and simple: remove any old .text50 block and append our fresh one
  // But don't remove other page-specific styles.

  // Check if it's a blog page by looking for the sibling content.html
  const dir = path.dirname(filePath);
  if (!fs.existsSync(path.join(dir, "content.html"))) return false;

  // Append the block if not already present or replace if old
  if (content.includes("Article Body Text (Auto-Sync)")) {
    // Replace existing
    const startMarker =
      "/* =====================\n   Article Body Text (Auto-Sync)";
    const startIndex = content.indexOf(startMarker);
    if (startIndex !== -1) {
      content = content.substring(0, startIndex);
    }
  }

  const finalContent = content.trim() + "\n" + styleBlock;
  fs.writeFileSync(filePath, finalContent, "utf8");
  return true;
}

const pages = fs.readdirSync(pagesDir);
let fixedCount = 0;
pages.forEach((page) => {
  // Some pages have multiple CSS files or strangely named ones.
  // We target the one named after the page dir or the main one listed in frontmatter.
  const cssPath = path.join(pagesDir, page, `${page}.css`);
  if (fs.existsSync(cssPath)) {
    if (syncCss(cssPath)) {
      fixedCount++;
      console.log(`Synced CSS: ${page}`);
    }
  } else {
    // Try any .css in the directory
    const files = fs.readdirSync(path.join(pagesDir, page));
    const cssFiles = files.filter((f) => f.endsWith(".css"));
    cssFiles.forEach((f) => {
      if (syncCss(path.join(pagesDir, page, f))) {
        fixedCount++;
        console.log(`Synced CSS (Alt): ${page}/${f}`);
      }
    });
  }
});

console.log(`Total CSS files synced: ${fixedCount}`);
