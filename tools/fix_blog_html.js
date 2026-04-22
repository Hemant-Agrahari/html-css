const fs = require("fs");
const path = require("path");

const blogHtmlPath = path.join(__dirname, "pages/blog/content.html");
let content = fs.readFileSync(blogHtmlPath, "utf8");

// Fix Cheerio wrapping over frontmatter
if (content.startsWith('<html lang="en"><head></head><body>---')) {
  content = content.replace('<html lang="en"><head></head><body>---', "---");
} else if (content.startsWith("<html><head></head><body>---")) {
  content = content.replace("<html><head></head><body>---", "---");
}

// Remove trailing tags
if (content.trim().endsWith("</body></html>")) {
  content = content.trim().slice(0, -"</body></html>".length);
}

fs.writeFileSync(blogHtmlPath, content, "utf8");
console.log("Fixed blog.html frontmatter");
