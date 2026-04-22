const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const sharp = require("sharp");

const BASE_URL = "https://www.ezheatandair.com";
const BLOG_LIST_URL = "https://www.ezheatandair.com/blog";
const PAGES_DIR = path.join(__dirname, "../pages");
const ASSETS_BLOG_DIR = path.join(__dirname, "assets/images/blog");

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await sharp(buffer).webp({ quality: 80 }).toFile(destPath);
    return true;
  } catch (e) {
    console.error(`Failed to download ${url}: ${e.message}`);
    return false;
  }
}

async function migratePost(slug) {
  const localDir = path.join(PAGES_DIR, slug);
  if (fs.existsSync(localDir)) {
    console.log(`Post ${slug} already exists, skipping full migration.`);
    return;
  }

  console.log(`Migrating post: ${slug}...`);
  fs.mkdirSync(localDir, { recursive: true });
  const assetDir = path.join(localDir, "assets");
  fs.mkdirSync(assetDir, { recursive: true });

  const url = `${BASE_URL}${slug.startsWith("/") ? slug : "/" + slug}`;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Basic extraction for blog posts
  const title = $("title").text().split("|")[0].trim().replace(/"/g, "'");
  const description = (
    $('meta[name="description"]').attr("content") || ""
  ).replace(/"/g, "'");

  // Use a generic blog template or copy from another blog
  const refBlog =
    "5-reasons-your-water-heater-isnt-working-and-how-san-diego-experts-can-help";
  const refDir = path.join(PAGES_DIR, refBlog);

  if (fs.existsSync(refDir)) {
    fs.cpSync(refDir, localDir, { recursive: true });
  }

  // Update content.html
  const frontmatter = `---\ntitle: "${title}"\ndescription: "${description}"\ncss: ${slug}.css\njs: ${slug}.js\n---\n\n`;

  // Scrape main blog content
  // Note: Blog content usually lives in a specific div
  const blogContent =
    $(".blog-detail-content, article, .post-content").html() ||
    "Content missing";

  const contentHtml = `<!DOCTYPE html><html lang="en"><body>{{head-meta}}\n<div class="page-wrapper">\n{{header}}\n<div class="blog-post-content">\n${blogContent}\n</div>\n{{footer}}\n</div>\n{{footer-scripts}}</body></html>`;

  fs.writeFileSync(
    path.join(localDir, "content.html"),
    frontmatter + contentHtml,
  );

  // Rename CSS/JS
  const oldCss = path.join(localDir, `${refBlog}.css`);
  const newCss = path.join(localDir, `${slug}.css`);
  if (fs.existsSync(oldCss)) fs.renameSync(oldCss, newCss);

  const oldJs = path.join(localDir, `${refBlog}.js`);
  const newJs = path.join(localDir, `${slug}.js`);
  if (fs.existsSync(oldJs)) fs.renameSync(oldJs, newJs);
}

async function run() {
  const blogCards = [];

  for (let page = 2; page <= 4; page++) {
    console.log(`Scraping Blog Page ${page}...`);
    const pageUrl = `${BLOG_LIST_URL}?page=${page}`;
    const res = await fetch(pageUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".image-placeholder-parent").each((i, el) => {
      const $card = $(el);
      const title = $card.find(".heading").text().trim();
      const href = $card.find("a").attr("href") || "";
      const slug = href.replace(".html", "").replace(/^\//, "");
      const desc = $card.find(".dec").html() || "";
      let imgUrl = $card.find("img").attr("src") || "";
      const date = $card
        .find(".meta-info p")
        .first()
        .find("span")
        .text()
        .trim();
      const views = $card
        .find(".meta-info p")
        .last()
        .find("span")
        .text()
        .trim();

      if (imgUrl.includes("url=")) {
        const match = imgUrl.match(/url=([^&]+)/);
        if (match) imgUrl = decodeURIComponent(match[1]);
      }
      if (!imgUrl.startsWith("http") && imgUrl) {
        imgUrl = `${BASE_URL}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
      }

      blogCards.push({ title, slug, desc, imgUrl, date, views });
    });
  }

  console.log(`Found ${blogCards.length} cards.`);

  // Migrate posts and process images
  if (!fs.existsSync(ASSETS_BLOG_DIR))
    fs.mkdirSync(ASSETS_BLOG_DIR, { recursive: true });

  for (const card of blogCards) {
    // Migrate individual post if needed
    await migratePost(card.slug);

    // Download thumbnail for blog list
    if (card.imgUrl) {
      const imgName = `${card.slug}.webp`;
      const destPath = path.join(ASSETS_BLOG_DIR, imgName);
      if (!fs.existsSync(destPath)) {
        console.log(`Downloading thumbnail for ${card.slug}...`);
        await downloadImage(card.imgUrl, destPath);
      }
      card.localImg = `../../assets/images/blog/${imgName}`;
    }
  }

  // Update blog/content.html
  const blogListPath = path.join(PAGES_DIR, "blog/content.html");
  let blogHtml = fs.readFileSync(blogListPath, "utf8");
  const $blog = cheerio.load(blogHtml, { decodeEntities: false });

  const $container = $blog("#blog-posts-container");

  blogCards.forEach((card) => {
    const cardHtml = `
      <div class="image-placeholder-parent mb-4">
        <div class="img-wrapper">
          <img src="${card.localImg}" class="image-placeholder-icon" alt="${card.title}" decoding="async" width="825" height="388" loading="lazy" />
        </div>
        <div class="frame-group">
          <div class="heading-parent">
            <a href="${card.slug}.html">
              <h2 class="heading">${card.title}</h2>
            </a>
            <p class="dec">${card.desc}</p>
          </div>
          <div class="post-date-wrapper d-flex justify-content-between align-items-end">
            <div class="view-post-parent">
              <a href="${card.slug}.html" class="view-post">View Post →</a>
            </div>
            <div class="meta-info text-end">
              <p class="com-para m-0">Publish Date : <span>${card.date}</span></p>
              <p class="com-para m-0">Views : <span>${card.views}</span></p>
            </div>
          </div>
        </div>
      </div>`;
    $container.append(cardHtml);
  });

  fs.writeFileSync(blogListPath, $blog.html());
  console.log("Successfully updated blog listing with cards from pages 2-4.");
}

run();
