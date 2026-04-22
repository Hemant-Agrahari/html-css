const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// Gold standard reference template
const PAGES_DIR = path.join(__dirname, "../pages");
const REF_SLUG =
  "stay-warm-this-winter-top-heating-repair-services-in-san-diego-ca";
const REF_DIR = path.join(PAGES_DIR, REF_SLUG);
const REF_HTML_PATH = path.join(REF_DIR, "content.html");

// All unmigrated slugs (folders with no content.html)
const UNMIGRATED = [
  "6-tips-for-keeping-your-home-comfortable-during-the-holidays",
  "air-duct-cleaning-improve-airflow",
  "benefits-of-smart-thermostat-san-diego",
  "choosing-the-right-warmth-a-comparative-guide-to-heat-pump-vs-traditional-heating-systems",
  "common-causes-of-air-compression-failure-and-how-to-fix",
  "common-reasons-why-your-water-heater-stopped-working",
  "do-i-need-a-water-softener",
  "ductless-heat-pump-repair-maintenance-san-diego",
  "essential-points-to-consider-for-water-heater-repair-and-installation",
  "getting-most-out-of-wall-heater-installation-repair",
  "global-students-scholarship-program",
  "hot-water-heater-not-working-signs-your-water-heater-is-going-bad",
  "how-drain-cleaning-services-keep-your-home-safe-and-clean",
  "how-tank-and-tankless-water-heaters-work",
  "how-to-choose-right-size-ac-unit-for-your-home",
  "how-to-choose-right-size-heat-pump-for-your-home",
  "how-to-clean-air-condition-ducts-for-maximum-efficiency",
  "how-to-clean-air-ducts",
  "how-to-extend-the-life-of-your-tankless-water-heater-with-regular-repairs",
  "how-to-flush-your-water-heater",
  "how-to-maintain-and-troubleshoot-your-heat-pump-water-heater",
  "how-to-spot-good-heating-contractor",
  "how-to-troubleshoot-hvac-system-when-it-stops-working",
  "improving-energy-efficiency-heating-systems",
  "keep-your-water-heater-running-efficiently-during-winter",
  "los-angeles-air-conditioner-repair-installation",
  "los-angeles-air-duct-cleaning-services",
  "los-angeles-tankless-water-heater-repair-installation",
  "los-angeles-water-heater-repair-installation",
  "orange-county-heat-pump",
  "orange-county-hvac-repair-installation",
  "orange-county-tankless-water-heater-repair-installation",
  "orange-county-water-heater-installation-service",
  "orange-county-water-heater-repair-installation",
  "prepare-your-water-heater-for-winter-months",
  "pros-and-cons-of-tankless-water-heater",
  "riverside-heating-repair",
  "riverside-hvac-repair",
  "riverside-tankless-water-heater-repair-installation",
  "riverside-water-heater-repair-installation",
  "san-diego-air-conditioner-coil-cleaner",
  "san-diego-air-filter-cleaner",
  "san-diego-air-filtration",
  "san-diego-air-scrubber-purification-system",
  "san-diego-central-air-conditioner",
  "san-diego-dehumidifiers",
  "san-diego-ductless-heating",
  "san-diego-electronic-air-cleaner",
  "san-diego-forced-air-unit",
  "san-diego-heater-tune-up",
  "san-diego-heating-installation-replacement",
  "san-diego-heating-repair-service",
  "san-diego-heat-pump-contractors",
  "san-diego-home-heater-guide",
  "san-diego-hvac-financing",
  "san-diego-hvac-package-unit",
  "san-diego-hvac-repair",
  "san-diego-thermostat-installation",
  "san-diego-thermostats-and-hybrid-systems",
  "san-diego-uv-light-system",
  "san-diego-wall-heater-repair-installation",
  "sd-heating-repair",
  "sign-that-your-water-heater-has-fault",
  "smart-water-heater-repairs-technology-solutions-2025",
  "spring-cleaning-checklist-for-ac-tune-up",
  "steps-to-find-perfect-ac-installation",
  "summer-ac-tune-up",
  "symptoms-low-refrigerant-ac-unit",
  "the-benefits-of-regular-hvac-system-inspections",
  "tips-for-efficiently-using-air-conditioner-this-summer",
  "troubleshooting-guide-on-how-to-fix-faulty-thermostat",
  "water-heater-installation-choose-right-one-home",
  "water-heater-leaking-from-drain-valve",
  "water-heater-repair-san-diego-factors",
  "water-heater-repair-vs-replacement-what's-the-best-choice",
  "water-source-heat-pumps-san-diego",
  "what-is-an-earthquake-shut-off-valve",
  "what-should-you-do-when-your-air-conditioner-is-blowing-warm-air",
  "what-to-do-if-your-water-heater-leaking-from-bottom",
  "when-should-you-clean-your-dryer-vent-filter",
  "when-should-your-water-heater-be-replaced",
  "which-size-tankless-water-heater-do-i-need",
  "why-air-duct-cleaning-is-important-for-your-homes-health",
  "why-heat-pump-is-best-way-to-heat-your-home",
  "why-professional-water-heater-installation-is-worth-investment",
];

// Slugify a title to roughly match
function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function migrate() {
  // Read the reference template once
  const refHtml = fs.readFileSync(REF_HTML_PATH, "utf8");

  // Strip frontmatter from ref (everything between first --- and second ---)
  const fmMatch = refHtml.match(/^---[\s\S]*?---\n*/);
  const refBodyHtml = fmMatch ? refHtml.slice(fmMatch[0].length) : refHtml;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of UNMIGRATED) {
    const localDir = path.join(PAGES_DIR, slug);
    const contentHtmlPath = path.join(localDir, "content.html");

    if (fs.existsSync(contentHtmlPath)) {
      console.log(`[SKIP] ${slug} already has content.html`);
      skipped++;
      continue;
    }

    const url = `https://www.ezheatandair.com/${slug}`;
    console.log(`[FETCH] ${url}`);

    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      if (!response || response.status() === 404) {
        console.log(`[404] ${slug} - no live page, skipping`);
        failed++;
        continue;
      }

      // Extract page title, description, and main content
      const scraped = await page.evaluate(() => {
        const title =
          document.querySelector("h1")?.innerText?.trim() ||
          document.title
            .replace(/ [-|] EZ.*$/i, "")
            .replace(/EZ Heat.*\|/i, "")
            .trim();

        const metaDesc =
          document.querySelector('meta[name="description"]')?.content || "";

        // Try known content containers first
        let contentEl =
          document.querySelector(".blog-detail-content") ||
          document.querySelector(".post-content") ||
          document.querySelector("article .content") ||
          document.querySelector("article") ||
          null;

        // Fallback: largest text block
        if (!contentEl) {
          let best = null;
          let bestScore = 0;
          document
            .querySelectorAll("section, .container, main")
            .forEach((el) => {
              const pCount = el.querySelectorAll("p, h2, h3, li").length;
              const textLen = el.innerText?.length || 0;
              const score = pCount * 10 + textLen;
              if (score > bestScore && el.innerText?.length > 300) {
                bestScore = score;
                best = el;
              }
            });
          contentEl = best;
        }

        // Remove nav/header/footer/breadcrumb children from contentEl
        if (contentEl) {
          [
            "nav",
            "header",
            "footer",
            ".breadcrumb",
            ".navbar",
            "[class*='breadcrumb']",
          ].forEach((sel) => {
            contentEl.querySelectorAll(sel).forEach((el) => el.remove());
          });
        }

        return {
          title,
          description: metaDesc,
          content: contentEl?.innerHTML || "",
        };
      });

      if (!scraped.content || scraped.content.trim().length < 100) {
        console.log(`[EMPTY] ${slug} - could not extract content`);
        failed++;
        continue;
      }

      const safeTitle = (scraped.title || titleFromSlug(slug)).replace(
        /"/g,
        "'",
      );
      const safeDesc = (scraped.description || safeTitle)
        .replace(/"/g, "'")
        .slice(0, 300);

      // Build frontmatter
      const frontmatter = `---\ntitle: "${safeTitle}"\ndescription: "${safeDesc}"\ncss: ${slug}.css\njs: ${slug}.js\n---\n\n`;

      // Patch reference template with new values
      let html = refBodyHtml
        // Title tag
        .replace(
          /<title>.*?<\/title>/s,
          `<title>${safeTitle} - EZ Heat &amp; Air</title>`,
        )
        // Breadcrumb text
        .replace(
          /<div class="why-do-slab">[\s\S]*?<\/div>/,
          `<div class="why-do-slab">${safeTitle}</div>`,
        )
        // H1
        .replace(
          /<h1 class="why-do-slab1">[\s\S]*?<\/h1>/,
          `<h1 class="why-do-slab1">${safeTitle}</h1>`,
        )
        // Hero image
        .replace(
          /src="\.\.\/\.\.\/assets\/images\/blog\/stay-warm-winter\.webp"/,
          `src="../../assets/images/blog/${slug}.webp"`,
        )
        .replace(/alt="Stay Warm This Winter[^"]*"/, `alt="${safeTitle}"`)
        // Blog breadcrumb item text
        .replace(
          /<div class="why-do-slab">[^<]*<\/div>/,
          `<div class="why-do-slab">${safeTitle}</div>`,
        )
        // Publish date
        .replace(/Publish Date : 18-02-2025/, `Publish Date : 2025-02-18`)
        // CSS reference
        .replace(
          /href="\.\.\/pages\/stay-warm-this-winter[^"]*\.css"/,
          `href="../pages/${slug}/${slug}.css"`,
        )
        // JSON-LD headline
        .replace(
          /"headline": "Stay Warm This Winter[^"]*"/,
          `"headline": "${safeTitle}"`,
        )
        // JSON-LD description (rough)
        .replace(
          /"description": ".*?",(\s*"image")/s,
          `"description": "${safeDesc}",\$1`,
        );

      // Inject scraped content after .blog-contact
      const contactEnd = html.indexOf(
        '</div>\n              <div class="post-injected-content',
      );
      const injectedIdx = html.indexOf('<div class="post-injected-content');
      const injectedEnd = html.indexOf("</div>", injectedIdx) + 6;

      // Replace the injected content block
      if (injectedIdx !== -1) {
        html =
          html.slice(0, injectedIdx) +
          `<div class="post-injected-content mt-4" style="color: #4a4a4a;">${scraped.content}</div>` +
          html.slice(injectedEnd);
      }

      // Ensure directory exists
      fs.mkdirSync(localDir, { recursive: true });

      // Copy CSS/JS stubs from reference if they don't exist
      const refCss = path.join(REF_DIR, `${REF_SLUG}.css`);
      const refJs = path.join(REF_DIR, `${REF_SLUG}.js`);
      const newCss = path.join(localDir, `${slug}.css`);
      const newJs = path.join(localDir, `${slug}.js`);
      if (!fs.existsSync(newCss) && fs.existsSync(refCss))
        fs.copyFileSync(refCss, newCss);
      if (!fs.existsSync(newJs) && fs.existsSync(refJs))
        fs.copyFileSync(refJs, newJs);

      fs.writeFileSync(contentHtmlPath, frontmatter + html, "utf8");
      console.log(`[OK] ${slug}`);
      success++;
    } catch (err) {
      console.error(`[ERROR] ${slug}: ${err.message}`);
      failed++;
    }
  }

  await browser.close();
  console.log(`\n=== Migration Complete ===`);
  console.log(
    `Success: ${success} | Skipped: ${skipped} | Failed/404: ${failed}`,
  );
}

migrate().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
