const { chromium } = require("playwright");

async function extractPage3() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://www.ezheatandair.com/blog?page=3", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".image-placeholder-parent");

  const cards = await page.evaluate(() => {
    const data = [];
    const elements = document.querySelectorAll(".image-placeholder-parent");

    elements.forEach((el) => {
      const headingEl = el.querySelector(".heading");
      const aEl = el.querySelector(".heading-parent a");
      const descEl = el.querySelector(".dec");
      const imgEl = el.querySelector("img");
      const dateEl = el.querySelector(".meta-info p:first-child span");
      const viewsEl = el.querySelector(".meta-info p:last-child span");

      const title = headingEl
        ? headingEl.textContent.trim().replace(/\s+/g, " ")
        : "";
      const href = aEl ? aEl.getAttribute("href") : "";
      const slug = href ? href.replace(".html", "").replace(/^\//, "") : "";
      const desc = descEl
        ? descEl.innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim()
            .replace(/\s+/g, " ")
        : "";

      let imgUrl = imgEl ? imgEl.getAttribute("src") : "";
      if (imgUrl.includes("url=")) {
        const match = imgUrl.match(/url=([^&]+)/);
        if (match) imgUrl = decodeURIComponent(match[1]);
      }
      if (!imgUrl.startsWith("http") && imgUrl) {
        imgUrl = `https://www.ezheatandair.com${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
      }

      const date = dateEl ? dateEl.textContent.trim() : "";
      const views = viewsEl ? viewsEl.textContent.trim() : "";

      data.push({ title, slug, desc, imgUrl, date, views });
    });

    return data;
  });

  require("fs").writeFileSync(
    "../data/cards_page3.json",
    JSON.stringify(cards, null, 2),
  );
  console.log("Saved to cards_page3.json");
  await browser.close();
}

extractPage3().catch((e) => {
  console.error(e);
  process.exit(1);
});
