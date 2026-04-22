const { chromium } = require("playwright");

async function testDetail() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    "https://www.ezheatandair.com/tank-vs-tankless-choosing-the-right-water-heater-installation-tips",
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(3000);

  const contentMap = await page.evaluate(() => {
    return {
      hasBlogDetail: !!document.querySelector(".blog-detail-content"),
      hasArticle: !!document.querySelector("article"),
      hasPostContent: !!document.querySelector(".post-content"),
      bodyClass: document.body.className,
      allPtagsCount: document.querySelectorAll("p").length,
    };
  });
  console.log("Analysis:", contentMap);

  if (contentMap.allPtagsCount > 0) {
    const parentClasses = await page.evaluate(() => {
      // Find a P tag that has a lot of text, likely blog text
      const p = Array.from(document.querySelectorAll("p")).find(
        (p) => p.textContent.length > 100,
      );
      return p ? p.parentElement.className : "Not found";
    });
    console.log("Likely blog wrapper class:", parentClasses);
  }

  await browser.close();
}

testDetail();
