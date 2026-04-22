const { chromium } = require("playwright");

async function testPagination() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://www.ezheatandair.com/blog");
  await page.waitForSelector(".image-placeholder-parent");

  console.log("Page 1 loaded.");

  try {
    // Look for pagination
    const buttons = await page.$$("ul.pagination li a");
    let clicked = false;
    for (const btn of buttons) {
      const text = await btn.innerText();
      if (text.trim() === "3") {
        await btn.click();
        console.log("Clicked page 3");
        await page
          .waitForResponse(
            (response) => response.url().includes("_next/data"),
            { timeout: 10000 },
          )
          .catch(() => console.log("no next data req"));
        await page.waitForTimeout(2000); // wait for re-render
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log("Could not find page 3 button");
      // Try next button
      await page
        .locator('ul.pagination li a:has-text("›")')
        .click()
        .catch(() => console.log("no next btn"));
      await page.waitForTimeout(2000);
      await page
        .locator('ul.pagination li a:has-text("›")')
        .click()
        .catch(() => console.log("no next btn"));
      await page.waitForTimeout(2000);
    }

    const titles = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(".image-placeholder-parent .heading"),
      ).map((el) => el.textContent.trim().replace(/\s+/g, " "));
    });
    console.log("Titles on current page:", titles);
  } catch (e) {
    console.error(e);
  }

  await browser.close();
}

testPagination();
