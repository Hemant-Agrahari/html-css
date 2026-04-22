const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const PAGES_DIR = path.join(__dirname, "../pages");
const REF_BLOG =
  "stay-warm-this-winter-top-heating-repair-services-in-san-diego-ca";
const REF_DIR = path.join(PAGES_DIR, REF_BLOG);
const REF_HTML_PATH = path.join(REF_DIR, "content.html");

function reconstruct() {
  let allCards = [];

  if (fs.existsSync("../data/cards_page2.json")) {
    allCards.push(...JSON.parse(fs.readFileSync("../data/cards_page2.json", "utf8")));
  }
  if (fs.existsSync("../data/cards_rest.json")) {
    allCards.push(...JSON.parse(fs.readFileSync("../data/cards_rest.json", "utf8")));
  }

  const uniqueCards = [];
  const seenSlugs = new Set();
  for (const card of allCards) {
    if (!seenSlugs.has(card.slug) && card.slug !== "") {
      seenSlugs.add(card.slug);
      uniqueCards.push(card);
    }
  }

  console.log(`Found ${uniqueCards.length} unique cards to reconstruct.`);

  const refHtmlRaw = fs.readFileSync(REF_HTML_PATH, "utf8");

  for (const card of uniqueCards) {
    const slug = card.slug;
    const localDir = path.join(PAGES_DIR, slug);
    const contentHtmlPath = path.join(localDir, "content.html");

    // We only process if it was generated poorly (i.e. has frontmatter and misses breadcrumbs)
    if (!fs.existsSync(contentHtmlPath)) continue;

    const currentHtml = fs.readFileSync(contentHtmlPath, "utf8");

    // Only parse ones we badly generated (they have <div class="blog-post-content">)
    if (!currentHtml.includes('class="blog-post-content"')) {
      console.log(
        `Skipping ${slug}, appears to not be a wrongly generated payload.`,
      );
      continue;
    }

    console.log(`Reconstructing ${slug}...`);

    // Extract the raw payload
    const $curr = cheerio.load(currentHtml);
    const blogContent = $curr(".blog-post-content").html();

    // Now load the reference template
    // Note: Cheerio removes <script> and <html> wrappers if we aren't careful, so we use full load
    const $ref = cheerio.load(refHtmlRaw, { decodeEntities: false });

    // Update <title>
    const safeTitle = card.title.replace(/"/g, "'");
    const safeDesc = card.desc.replace(/"/g, "'");
    $ref("head title").text(`${safeTitle} - EZ Heat & Air`);

    // Update schema JSON if possible
    $ref('script[type="application/ld+json"]').each((i, el) => {
      try {
        let json = JSON.parse($ref(el).html());
        json.headline = safeTitle;
        json.description = safeDesc;
        json.datePublished = `2025-02-18 16:30`; // Mocked or use card.date if parsable
        $ref(el).html(JSON.stringify(json, null, 2));
      } catch (e) {}
    });

    // Update breadcrumb
    $ref(".why-do-slab").text(safeTitle);

    // Update H1
    $ref("h1.why-do-slab1").text(safeTitle);

    // Update date and views
    // Look for the date text "Publish Date : 18-02-2025"
    $ref('div:contains("Publish Date :")').each((i, el) => {
      if ($ref(el).text().includes("Publish Date :")) {
        // Cheerio contains can match parents. We want the exact text node holder.
        if ($ref(el).children().length === 0) {
          $ref(el).text(`Publish Date : ${card.date || "2025-02-18"}`);
        }
      }
    });

    $ref(".com-para span").each((i, el) => {
      if ($ref(el).parent().text().includes("Views :")) {
        $ref(el).text(card.views || "1200");
      }
    });

    // Update Image
    let slugImg = card.slug;
    // ensure image exists, build.js copies it if it's there
    $ref(".img-why-do-slab-leaks-occur-mo").attr(
      "src",
      `../../assets/images/blog/${slugImg}.webp`,
    );
    $ref(".img-why-do-slab-leaks-occur-mo").attr("alt", safeTitle);

    // Replace actual content!
    // Delete everything after .blog-contact within its parent
    const $contactBtn = $ref(".blog-contact");
    $contactBtn.nextAll().remove();

    // Inject the real content
    $contactBtn.after(
      `<div class="post-injected-content mt-4" style="color: #4a4a4a;">${blogContent}</div>`,
    );

    // Ensure CSS / JS paths match the correct files
    $ref(`link[href*="stay-warm-this-winter"]`).attr(
      "href",
      `../pages/${slug}/${slug}.css`,
    );

    // We also need to add the frontmatter so that build.js correctly hooks the SEO descriptions
    const frontmatter = `---\ntitle: "${safeTitle}"\ndescription: "${safeDesc}"\ncss: ${slug}.css\njs: ${slug}.js\n---\n\n`;

    // Rebuild final string
    let finalHtml = $ref.html();

    // remove the html/head wrapper that cheerio added if the original was a fragment, but since REF is a full HTML page, we serialize it fully.
    finalHtml = frontmatter + finalHtml;

    fs.writeFileSync(contentHtmlPath, finalHtml);
    console.log(`Success: ${slug}`);
  }

  console.log("Reconstruction completed.");
}

reconstruct();
