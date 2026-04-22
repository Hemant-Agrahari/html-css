const fs = require("fs");
const cheerio = require("cheerio");

const rawHtml = fs.readFileSync("/tmp/scraper/la_emergency_raw.html", "utf8");
const $ = cheerio.load(rawHtml);

const classes = [
  ".immediate-slab-leak-detection",
  ".slab-leak-detection",
  ".gas-line-services",
  ".gas-leak-info",
  ".promo-carousel",
  ".promo-strip",
  ".testimonials-section",
  ".why-ez-section",
  ".faq-section",
];

classes.forEach((c) => {
  console.log(`${c}: ${$(c).length > 0 ? "Found" : "Not Found"}`);
});
