const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PAGES_DIR = path.join(__dirname, "../pages");
const REF_BLOG =
  "5-reasons-your-water-heater-isnt-working-and-how-san-diego-experts-can-help";
const REF_DIR = path.join(PAGES_DIR, REF_BLOG);

async function generateDetails() {
  let allCards = [];

  // Load cards from our extractions
  if (fs.existsSync("../data/cards_page2.json")) {
    allCards.push(...JSON.parse(fs.readFileSync("../data/cards_page2.json", "utf8")));
  }
  if (fs.existsSync("../data/cards_rest.json")) {
    allCards.push(...JSON.parse(fs.readFileSync("../data/cards_rest.json", "utf8")));
  }

  // Filter out duplicates by slug
  const uniqueCards = [];
  const seenSlugs = new Set();
  for (const card of allCards) {
    if (!seenSlugs.has(card.slug) && card.slug !== "") {
      seenSlugs.add(card.slug);
      uniqueCards.push(card);
    }
  }

  console.log(`Found ${uniqueCards.length} unique cards to process.`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const card of uniqueCards) {
    const slug = card.slug;
    const localDir = path.join(PAGES_DIR, slug);
    const contentHtmlPath = path.join(localDir, "content.html");

    if (fs.existsSync(contentHtmlPath)) {
      console.log(
        `[Cache Hit] Post ${slug} completely exists in pages/. Skipping.`,
      );
      continue;
    }

    console.log(`[Fetching] Migrating post: ${slug}...`);
    try {
      const url = `https://www.ezheatandair.com/${slug}`;
      const response = await page.goto(url, { waitUntil: "networkidle" });

      if (response.status() === 404) {
        console.log(`404 Not Found for ${url}`);
        continue;
      }

      const blogContent = await page.evaluate(() => {
        let contentEl =
          document.querySelector(".blog-detail-content") ||
          document.querySelector("article") ||
          document.querySelector(".post-content");

        if (!contentEl) {
          // Heuristic: Find the container with the most <p> tags
          let maxP = 0;
          let bestEl = null;
          document.querySelectorAll("div").forEach((div) => {
            // we only want divs that are relatively direct parents of text, not the whole page wrapper
            if (div.innerText.length > 500) {
              const pCount = div.querySelectorAll("p").length;
              const childDivs = div.querySelectorAll("div").length;
              // we want the deepest div that contains the most p tags
              if (pCount > maxP && childDivs < 10) {
                maxP = pCount;
                bestEl = div;
              }
            }
          });

          if (!bestEl && maxP === 0) {
            const allP = Array.from(document.querySelectorAll("p"));
            if (allP.length > 0) {
              bestEl =
                allP.find((p) => p.textContent.length > 100)?.parentElement ||
                allP[0].parentElement;
            }
          }

          contentEl = bestEl;
        }

        return contentEl ? contentEl.innerHTML : "";
      });

      if (!blogContent) {
        console.log(`Could not extract blog-detail-content for ${slug}`);
        continue;
      }

      // Prepare local directory
      fs.mkdirSync(localDir, { recursive: true });
      fs.cpSync(REF_DIR, localDir, { recursive: true });

      // Clean up reference assets and prepare content.html
      const title = card.title.replace(/"/g, "'");
      const description = card.desc.replace(/"/g, "'");

      const frontmatter = `---\ntitle: "${title}"\ndescription: "${description}"\ncss: ${slug}.css\njs: ${slug}.js\n---\n\n`;
      const contentHtml = `<!DOCTYPE html><html lang="en"><body>{{head-meta}}\n<div class="page-wrapper">\n{{header}}\n<div class="blog-post-content">\n${blogContent}\n</div>\n{{footer}}\n</div>\n{{footer-scripts}}\n<script src="../../pages/${slug}/${slug}.js"></script></body></html>`;

      fs.writeFileSync(
        path.join(localDir, "content.html"),
        frontmatter + contentHtml,
      );

      // Rename CSS/JS
      const oldCss = path.join(localDir, `${REF_BLOG}.css`);
      const newCss = path.join(localDir, `${slug}.css`);
      if (fs.existsSync(oldCss)) fs.renameSync(oldCss, newCss);

      const oldJs = path.join(localDir, `${REF_BLOG}.js`);
      const newJs = path.join(localDir, `${slug}.js`);
      if (fs.existsSync(oldJs)) fs.renameSync(oldJs, newJs);

      // Update the JS file content to potentially reference the new class / names if there are any, though usually not strictly needed
      // Actually, we must update the JS file if it has references to ${REF_BLOG} or anything like that. But `migrate_blogs.js` didn't do it, so we replicate identically.

      console.log(`[Success] Migrated ${slug}`);
    } catch (err) {
      console.error(`Error migrating ${slug}:`, err.message);
    }
  }

  await browser.close();
  console.log("Done generating detail pages.");
}

generateDetails().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
