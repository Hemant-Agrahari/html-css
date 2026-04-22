const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const sitemapPath = path.join(__dirname, "../pages/sitemap/content.html");
const pagesDir = path.join(__dirname, "../pages");

const html = fs.readFileSync(sitemapPath, "utf8");
const $ = cheerio.load(html);

const links = [];
$("a").each((i, el) => {
  const href = $(el).attr("href");
  if (
    href &&
    href.endsWith(".html") &&
    href !== "index.html" &&
    href !== "about-us.html" &&
    href !== "blog.html" &&
    href !== "contact-us.html" &&
    href !== "faq.html" &&
    href !== "sitemap.html"
  ) {
    links.push(href);
  }
});

const uniqueLinks = [...new Set(links)];
let missing = 0;
let existing = 0;

console.log(
  `Total unique standard detail page links found in sitemap: ${uniqueLinks.length}`,
);

for (const link of uniqueLinks) {
  const slug = link.replace(".html", "");
  const slugDir = path.join(pagesDir, slug);
  if (fs.existsSync(slugDir)) {
    existing++;
  } else {
    missing++;
    console.log(`MISSING LOCAL PAGE: ${slug}`);
  }
}

console.log(`Summary: ${existing} existing, ${missing} missing.`);
