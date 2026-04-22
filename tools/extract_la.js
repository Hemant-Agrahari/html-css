const fs = require("fs");
const cheerio = require("cheerio");

const rawHtml = fs.readFileSync("/tmp/scraper/la_emergency_raw.html", "utf8");
const $ = cheerio.load(rawHtml);

const data = {
  h1: $("h1").text().trim(),
  bannerParagraphs: $(".immediate-slab-leak-detection p")
    .map((i, el) => $(el).text().trim())
    .get(),
  guaranteesTitle: $(".ez-plumbing-guarantees").text().trim(),
  guaranteesList: $(".info-columns > div")
    .map((i, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((x) => x),
  guaranteeImage: $(".image-container img").attr("src"),
  midTitle:
    $(".service-section h2").first().text().trim() ||
    $(".about-us-container h2").first().text().trim() ||
    $("h2").eq(1).text().trim(),
  midParagraphs: $(".service-section p")
    .map((i, el) => $(el).text().trim())
    .get(),
  midList: $(".service-section li, .service-section .list-wrap div")
    .map((i, el) => $(el).text().trim())
    .get(),
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

// Fallback search if classes differ
if (data.bannerParagraphs.length === 0) {
  data.bannerParagraphs = $("p")
    .slice(0, 4)
    .map((i, el) => $(el).text().trim())
    .get();
}

fs.writeFileSync("/tmp/scraper/la_data.json", JSON.stringify(data, null, 2));
console.log("Extraction complete");
