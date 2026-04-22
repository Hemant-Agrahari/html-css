const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

async function extractPage2() {
  const url = "https://www.ezheatandair.com/blog?page=2";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const cards = [];
  $(".image-placeholder-parent").each((i, el) => {
    const $card = $(el);
    const title = $card.find(".heading").text().trim().replace(/\s+/g, " ");
    const href = $card.find("a").attr("href") || "";
    const slug = href.replace(".html", "").replace(/^\//, "");
    const desc = $card.find(".dec").text().trim().replace(/\s+/g, " ");
    let imgUrl = $card.find("img").attr("src") || "";
    const date = $card.find(".meta-info p").first().find("span").text().trim();
    const views = $card.find(".meta-info p").last().find("span").text().trim();

    if (imgUrl.includes("url=")) {
      const match = imgUrl.match(/url=([^&]+)/);
      if (match) imgUrl = decodeURIComponent(match[1]);
    }
    if (!imgUrl.startsWith("http") && imgUrl) {
      imgUrl = `https://www.ezheatandair.com${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    }

    cards.push({ title, slug, desc, imgUrl, date, views });
  });

  console.log(JSON.stringify(cards, null, 2));
}

extractPage2();
