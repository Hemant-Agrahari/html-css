const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const pagesDir = path.join(__dirname, "../pages");

function fixHtml(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Split into frontmatter and body
  const parts = content.split("---");
  if (parts.length < 3) return;

  const yaml = parts[1];
  let body = parts.slice(2).join("---");

  // Use cheerio to parse and fix the body
  const $ = cheerio.load(body, { xmlMode: false, decodeEntities: false });

  // 1. Ensure the main content is wrapped in .text50
  const injectedContent = $(".post-injected-content");
  if (injectedContent.length) {
    const slabParent = injectedContent.find(".signs-of-a-slab-leak-parent");
    if (slabParent.length) {
      const innerDiv = slabParent.children("div");
      if (innerDiv.length && !innerDiv.hasClass("text50")) {
        innerDiv.addClass("text50");
      }
    } else {
      // Try wrapping the whole injected content if it looks raw
      if (!injectedContent.find(".text50").length) {
        injectedContent.wrapInner('<div class="text50"></div>');
      }
    }
  }

  // 2. Fix headings (h2/p with bold titles)
  $(".blog_sandiego_title").each((i, el) => {
    const $el = $(el);
    if ($el.is("p")) {
      // Convert p.blog_sandiego_title to h2.blog_sandiego_title for better SEO/Style
      $el.replaceWith(`<h2 class="blog_sandiego_title">${$el.html()}</h2>`);
    }
  });

  // 3. Detect missed lists (experimental - look for common patterns)
  // "Other home solutions include:" etc usually followed by bolded items or lines
  // This is risky to automate fully, so we'll just ensure existing lists have .custm-ul
  $("ul").each((i, el) => {
    $(el).addClass("custm-ul");
  });

  // Save back
  const newBody = $.html();
  const finalContent = `---${yaml}---${newBody}`;

  if (finalContent !== content) {
    fs.writeFileSync(filePath, finalContent, "utf8");
    return true;
  }
  return false;
}

const pages = fs.readdirSync(pagesDir);
let fixedCount = 0;
pages.forEach((page) => {
  const contentPath = path.join(pagesDir, page, "content.html");
  if (fs.existsSync(contentPath)) {
    if (fixHtml(contentPath)) {
      fixedCount++;
      console.log(`Fixed: ${page}`);
    }
  }
});

console.log(`Total pages fixed: ${fixedCount}`);
