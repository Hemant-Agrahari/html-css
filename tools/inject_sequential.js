const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const sharp = require("sharp");

const PAGES_DIR = path.join(__dirname, "../pages");
const ASSETS_BLOG_DIR = path.join(__dirname, "assets/images/blog");

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url.replace(/ /g, "%20"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await sharp(buffer).webp({ quality: 80 }).toFile(destPath);
    console.log(`Downloaded ${destPath}`);
    return true;
  } catch (e) {
    console.error(`Failed to download ${url}: ${e.message}`);
    return false;
  }
}

async function run() {
  const cards = JSON.parse(fs.readFileSync("../data/cards_page2.json", "utf8"));

  if (!fs.existsSync(ASSETS_BLOG_DIR)) {
    fs.mkdirSync(ASSETS_BLOG_DIR, { recursive: true });
  }

  const blogListPath = path.join(PAGES_DIR, "blog/content.html");
  let blogHtml = fs.readFileSync(blogListPath, "utf8");
  const $blog = cheerio.load(blogHtml, { decodeEntities: false });
  const $container = $blog("#blog-posts-container");

  // Since we already have 10 cards, let's just append these new 10.
  // Wait, let's make sure we don't append duplicates if script runs twice
  // So we can check if it already exists by slug

  for (const card of cards) {
    if (blogHtml.includes(card.slug + ".html")) {
      console.log(
        `Card ${card.slug} already in content.html, skipping HTML append.`,
      );
      continue;
    }

    let imgName = `${card.slug}.webp`;
    let destPath = path.join(ASSETS_BLOG_DIR, imgName);

    if (card.imgUrl) {
      if (!fs.existsSync(destPath)) {
        await downloadImage(card.imgUrl, destPath);
      }
    } else {
      imgName = "default.webp"; // Fallback
    }

    const localImg = `../../assets/images/blog/${imgName}`;
    const date = card.date || "01-02-2025";
    const views = card.views || "2500";

    const cardHtml = `
                  <div class="image-placeholder-parent mb-4">
                    <div class="img-wrapper">
                      <img src="${localImg}" class="image-placeholder-icon" alt="${card.title.replace(/"/g, "&quot;")}" decoding="async" width="825" height="388" loading="lazy">
                    </div>
                    <div class="frame-group">
                      <div class="heading-parent">
                        <a href="${card.slug}.html">
                          <h2 class="heading">
                            ${card.title}
                          </h2>
                        </a>
                        <p class="dec">
                          ${card.desc}
                        </p>
                      </div>
                      <div class="post-date-wrapper d-flex justify-content-between align-items-end">
                        <div class="view-post-parent">
                          <a href="${card.slug}.html" class="view-post">View Post →</a>
                        </div>
                        <div class="meta-info text-end">
                          <p class="com-para m-0">
                            Publish Date : <span>${date}</span>
                          </p>
                          <p class="com-para m-0">Views : <span>${views}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>`;
    $container.append(cardHtml);
  }

  // Preserve frontmatter
  let frontmatter = "";
  if (blogHtml.startsWith("---")) {
    const endMatch = blogHtml.indexOf("---", 3);
    if (endMatch !== -1) {
      frontmatter = blogHtml.substring(0, endMatch + 3) + "\n\n";
    }
  }

  // Cheerio wraps it in html, body sometimes, let's be careful.
  let finalHtml = $blog.html();
  // if frontmatter was present, cheerio might have messed it up.
  // Actually, cheerio will wrap `---` as text inside head or body.
  // We can just replace the container inside the original string.

  const updatedContainerHtml = $container.html();
  const startTag = '<div class="blog-grid" id="blog-posts-container">';
  const startIndex = blogHtml.indexOf(startTag);
  if (startIndex !== -1) {
    const before = blogHtml.substring(0, startIndex + startTag.length);
    const afterIndex = blogHtml.indexOf("</div>", startIndex + startTag.length);
    // Find the matching closing div for blog-grid.
    // simpler: search for the next closing div of the col-lg-9 if container is sibling.
  }
}

// better approach: replace just the innerHTML of the container.

async function safeInject() {
  const cards = JSON.parse(fs.readFileSync("../data/cards_rest.json", "utf8"));
  const blogListPath = path.join(PAGES_DIR, "blog/content.html");
  let blogHtml = fs.readFileSync(blogListPath, "utf8");

  if (!fs.existsSync(ASSETS_BLOG_DIR)) {
    fs.mkdirSync(ASSETS_BLOG_DIR, { recursive: true });
  }

  let appended = false;
  for (const card of cards) {
    if (blogHtml.includes(card.slug + ".html")) {
      console.log(`Card ${card.slug} already exists.`);
      continue;
    }

    let imgName = `${card.slug}.webp`;
    let destPath = path.join(ASSETS_BLOG_DIR, imgName);

    if (card.imgUrl) {
      if (!fs.existsSync(destPath)) {
        await downloadImage(card.imgUrl, destPath);
      }
    }

    const localImg = `../../assets/images/blog/${imgName}`;
    const date = card.date || "01-02-2025";
    const views = card.views || "2500";

    const cardHtml = `
                  <!-- Blog Card ${card.slug} -->
                  <div class="image-placeholder-parent mb-4">
                    <div class="img-wrapper">
                      <img src="${localImg}" class="image-placeholder-icon" alt="${card.title.replace(/"/g, "&quot;")}" decoding="async" width="825" height="388" loading="lazy">
                    </div>
                    <div class="frame-group">
                      <div class="heading-parent">
                        <a href="${card.slug}.html">
                          <h2 class="heading">
                            ${card.title}
                          </h2>
                        </a>
                        <p class="dec">
                          ${card.desc}
                        </p>
                      </div>
                      <div class="post-date-wrapper d-flex justify-content-between align-items-end">
                        <div class="view-post-parent">
                          <a href="${card.slug}.html" class="view-post">View Post →</a>
                        </div>
                        <div class="meta-info text-end">
                          <p class="com-para m-0">
                            Publish Date : <span>${date}</span>
                          </p>
                          <p class="com-para m-0">Views : <span>${views}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>`;

    // Insert right before the end of the container
    blogHtml = blogHtml.replace(
      "</div>\n              </div>\n\n              <!-- Sidebar Second for Mobile (Bottom) -->",
      cardHtml +
        "\n                </div>\n              </div>\n\n              <!-- Sidebar Second for Mobile (Bottom) -->",
    );
    appended = true;
  }

  if (appended) {
    fs.writeFileSync(blogListPath, blogHtml);
    console.log("Successfully appended cards to content.html");
  } else {
    console.log("No new cards appended.");
  }
}

safeInject();
