const fs = require("fs");
const cheerio = require("cheerio");

const rawHtml = fs.readFileSync("/tmp/scraper/oc_raw.html", "utf8");
const $ = cheerio.load(rawHtml);

const data = {
  h1: $("h1").text().trim(),
  bannerParagraphs: $(".immediate-slab-leak-detection p, p")
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((x) => x && x.length > 30)
    .slice(0, 4),
  midTitle: $(".service-section h2, .about-us-container h2, h2")
    .first()
    .text()
    .trim(),
  guaranteesList: $(".info-columns > div, .service-section li, li")
    .map((i, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((x) => x && x.length > 50)
    .slice(0, 4),
  faqs: $(".accordion-item")
    .map((i, el) => {
      return {
        q:
          $(el).find(".accordion-button").text().trim() ||
          $(el).find("h3").text().trim(),
        a:
          $(el).find(".accordion-body").text().trim() ||
          $(el).find("p").text().trim(),
      };
    })
    .get(),
};

fs.writeFileSync("/tmp/scraper/oc_data.json", JSON.stringify(data, null, 2));
console.log("Orange County extraction complete");
