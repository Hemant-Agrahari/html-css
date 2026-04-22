const { chromium } = require("playwright");
const fs = require("fs");

async function extractSequentialPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Navigating to /blog...");
  await page.goto("https://www.ezheatandair.com/blog", {
    waitUntil: "networkidle",
  });

  let allCards = [];

  const extractCards = async (pageNumber) => {
    const cards = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll(".image-placeholder-parent").forEach((el) => {
        const title = el.querySelector(".heading")
          ? el.querySelector(".heading").textContent.trim().replace(/\s+/g, " ")
          : "";
        const href = el.querySelector("a")
          ? el.querySelector("a").getAttribute("href")
          : "";
        const slug = href ? href.replace(".html", "").replace(/^\//, "") : "";
        const descEl = el.querySelector(".dec");
        const desc = descEl
          ? descEl.innerHTML
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()
              .replace(/\s+/g, " ")
          : "";
        let imgUrl = el.querySelector("img")
          ? el.querySelector("img").getAttribute("src")
          : "";
        if (imgUrl && imgUrl.includes("url=")) {
          const match = imgUrl.match(/url=([^&]+)/);
          if (match) imgUrl = decodeURIComponent(match[1]);
        }
        if (imgUrl && !imgUrl.startsWith("http")) {
          imgUrl = `https://www.ezheatandair.com${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
        }
        const date = el.querySelector(".meta-info p:first-child span")
          ? el.querySelector(".meta-info p:first-child span").textContent.trim()
          : "";
        const views = el.querySelector(".meta-info p:last-child span")
          ? el.querySelector(".meta-info p:last-child span").textContent.trim()
          : "";
        data.push({ title, slug, desc, imgUrl, date, views });
      });
      return data;
    });
    console.log(`Extracted ${cards.length} cards from page ${pageNumber}`);
    return cards;
  };

  const waitForChange = async (oldTitles) => {
    let retries = 0;
    while (retries < 20) {
      await page.waitForTimeout(500);
      const newTitles = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll(".image-placeholder-parent .heading"),
        ).map((el) => el.textContent.trim());
      });
      if (
        newTitles.length > 0 &&
        JSON.stringify(newTitles) !== JSON.stringify(oldTitles)
      ) {
        return newTitles;
      }
      retries++;
    }
  };

  let currentTitles = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".image-placeholder-parent .heading"),
    ).map((el) => el.textContent.trim()),
  );

  const clickPageBtn = async (num) => {
    let btns = await page.$$("button");
    let clicked = false;
    for (const btn of btns) {
      const text = await btn.textContent();
      if (text.trim() === num.toString()) {
        console.log(`Clicking page ${num} button...`);
        const className = (await btn.getAttribute("class")) || "";
        if (className.includes("active")) {
          console.log(`Page ${num} is already active`);
          return true;
        }
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // If the number doesn't exist, we might need to click "Next" button usually
      // For ezheatandair, let's just click 'Next' iteratively until we potentially find the number
      const nextBtns = await page.$$("button");
      for (const btn of nextBtns) {
        const text = await btn.textContent();
        if (
          text.trim() === "Next" ||
          text.trim() === "»" ||
          text.trim() === "›" ||
          text.trim().includes("Next")
        ) {
          console.log(`Cannot see ${num}, so clicking 'Next' button...`);
          await btn.click();
          await page.waitForTimeout(1000);
          currentTitles = (await waitForChange(currentTitles)) || currentTitles;
          // Retry checking for num
          return clickPageBtn(num);
        }
      }
    }

    if (clicked) {
      currentTitles = (await waitForChange(currentTitles)) || currentTitles;
    } else {
      console.log(`Could not find button for page ${num} and no Next button`);
    }
    return clicked;
  };

  // We loop all the way from 2 to 11 to ensure proper sequential state accumulation
  for (let p = 2; p <= 11; p++) {
    if (await clickPageBtn(p)) {
      if (p >= 6) {
        // We only need to store extraction for >= 6 since we already stored 2-5
        allCards.push(...(await extractCards(p)));
      } else {
        console.log(`Navigated past page ${p}`);
      }
    } else {
      console.log(`Stopping at page ${p} as it was not reachable.`);
      break;
    }
  }

  fs.writeFileSync("../data/cards_rest.json", JSON.stringify(allCards, null, 2));
  console.log(`Saved ${allCards.length} total new cards to cards_rest.json`);

  await browser.close();
}

extractSequentialPages().catch((e) => {
  console.error(e);
  process.exit(1);
});
