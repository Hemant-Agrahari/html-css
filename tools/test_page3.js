const { chromium } = require("playwright");
const fs = require("fs");

async function checkPage3() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("Navigating to page 3...");
  const response = await page.goto("https://www.ezheatandair.com/blog?page=3", {
    waitUntil: "networkidle",
  });
  console.log("Status:", response.status());

  await page.waitForTimeout(5000); // Wait for any client-side renders

  await page.screenshot({ path: "page3.png", fullPage: true });
  console.log("Screenshot saved to page3.png");

  const html = await page.content();
  fs.writeFileSync("page3.html", html);

  const cards = await page.evaluate(() => {
    const list = [];
    document
      .querySelectorAll(".image-placeholder-parent .heading")
      .forEach((el) => list.push(el.textContent.trim().replace(/\s+/g, " ")));
    return list;
  });

  fs.writeFileSync("../data/page3_titles.json", JSON.stringify(cards, null, 2));
  console.log(
    "Found",
    cards.length,
    "cards. Titles saved to page3_titles.json",
  );

  // Check for pagination links
  const pagination = await page.evaluate(() => {
    const links = [];
    document
      .querySelectorAll(".pagination a")
      .forEach((a) =>
        links.push({
          text: a.textContent.trim(),
          href: a.getAttribute("href"),
        }),
      );
    return links;
  });
  console.log("Pagination links found:", pagination);

  await browser.close();
}

checkPage3().catch(console.error);
