const fs = require("fs");

const contentHtmlPath = "pages/home/content.html";
let html = fs.readFileSync(contentHtmlPath, "utf8");

// Prepend yaml if missing
if (!html.startsWith("---")) {
  html = "---\ntitle: Home\ncss: home.css\n---\n" + html;
  fs.writeFileSync(contentHtmlPath, html);
  console.log("Added YAML frontmatter to content.html");
}

// Ensure the header css link is in head-meta.html or we can just leave it out
// since SKILL.md relies on global include or per-page css.
