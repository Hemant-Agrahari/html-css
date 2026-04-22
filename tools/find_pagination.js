const { chromium } = require("playwright");

async function findLinks() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://www.ezheatandair.com/blog", {
    waitUntil: "networkidle",
  });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => {
        return {
          text: a.textContent.trim(),
          href: a.getAttribute("href") || "",
        };
      })
      .filter((link) => /^[0-9]+$|Next|›/.test(link.text));
  });

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button"))
      .map((a) => {
        return { text: a.textContent.trim() };
      })
      .filter((link) => /^[0-9]+$|Next|Load|›/.test(link.text));
  });

  const pagination = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("[class*='pagin'], [class*='Pagin']"),
    ).map((el) => el.className);
  });

  console.log("Candidate links:", links);
  console.log("Candidate buttons:", buttons);
  console.log("Pagination classes:", pagination);

  await browser.close();
}
findLinks();
