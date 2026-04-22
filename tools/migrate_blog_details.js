const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const sharp = require("sharp");

// Ensure directories
const BASE_PAGES_DIR = path.join(__dirname, "../pages");
const IMG_DIR = path.join(__dirname, "../assets/images/blog");
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

async function downloadAndOptimizeImage(imgSrc) {
  try {
    let fullUrl = imgSrc;
    if (!fullUrl.startsWith("http")) {
      fullUrl =
        "https://www.ezheatandair.com" +
        (imgSrc.startsWith("/") ? "" : "/") +
        imgSrc;
    }

    // Check if it's already an absolute or relative image with a clear basename
    let urlObj;
    try {
      urlObj = new URL(fullUrl);
    } catch (e) {
      return null;
    }

    const basename = path.basename(urlObj.pathname);
    if (!basename) return null;

    const nameWithoutExt = basename.split(".")[0];
    const outFilename = `${nameWithoutExt}.webp`;
    const outPath = path.join(IMG_DIR, outFilename);

    // If exists, just return path
    if (fs.existsSync(outPath)) {
      return `../../assets/images/blog/${outFilename}`;
    }

    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.warn("Failed to download image:", fullUrl);
      return null;
    }

    const buffer = await res.arrayBuffer();
    await sharp(Buffer.from(buffer)).webp({ quality: 80 }).toFile(outPath);

    console.log(`Saved image: ${outFilename}`);
    return `../../assets/images/blog/${outFilename}`;
  } catch (err) {
    console.error("Error downloading image:", err.message);
    return null;
  }
}

async function scrapePage(slug) {
  const url = `https://www.ezheatandair.com/${slug}`;
  console.log(`\nFetching ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    console.warn(`Failed to fetch ${url}`);
    return null;
  }

  const text = await res.text();
  const $ = cheerio.load(text);

  const title =
    $("title").text() || `${slug.replace(/-/g, " ")} - EZ Heat & Air`;
  const desc = $('meta[name="description"]').attr("content") || "";
  const ogTags = $('meta[property^="og:"], meta[name^="twitter:"]')
    .map((i, el) => $.html(el))
    .get()
    .join("\n    ");
  const schemas = $('script[type="application/ld+json"]')
    .map((i, el) => $.html(el))
    .get()
    .join("\n    ");

  // Extract Breadcrumb details
  const breadcrumbLinks = $(".breadcrumbs5 a");
  let categoryName = "Blog";
  let categoryLink = "#";
  if (breadcrumbLinks.length >= 3) {
    categoryName = $(breadcrumbLinks[2]).text();
    // we could keep the href but we don't have valid category pages locally so "#" is safer or let's keep the text
  }
  const breadcrumbTitle =
    $(".why-do-slab").text() || title.replace(" - EZ Heat & Air", "");

  // Extract main article section
  let articleSectionHTML = "";
  const articleSection = $(".why-do-slab-leaks-occur-mostly-parent");
  if (articleSection.length > 0) {
    // Process images within article
    const images = articleSection.find("img");
    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      const src = img.attr("src");
      if (src) {
        const newSrc = await downloadAndOptimizeImage(src);
        if (newSrc) {
          img.attr("src", newSrc);
        }
      }
      // fix chevron images loading attributes explicitly if they are from internal assets
      if (src && src.includes("chevron")) {
        img.attr("src", "../../assets/images/blog/chevronrightdouble.svg");
      }
    }
    // Remove inline styles or classes that might conflict? Not needed, we are matching reference.
    articleSectionHTML = articleSection.html();
  } else {
    console.warn(`Warning: Could not find article section for ${slug}`);
  }

  return {
    title,
    desc,
    ogTags,
    schemas,
    categoryName,
    breadcrumbTitle,
    articleSectionHTML,
  };
}

async function generateLocalPage(slug, data) {
  const pageDir = path.join(BASE_PAGES_DIR, slug);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  // Copy CSS from reference
  const refCssPath = path.join(
    BASE_PAGES_DIR,
    "stay-warm-this-winter-top-heating-repair-services-in-san-diego-ca",
    "stay-warm-this-winter-top-heating-repair-services-in-san-diego-ca.css",
  );
  const targetCssPath = path.join(pageDir, `${slug}.css`);
  if (fs.existsSync(refCssPath)) {
    fs.copyFileSync(refCssPath, targetCssPath);
  }

  // Create JS
  const targetJsPath = path.join(pageDir, `${slug}.js`);
  if (!fs.existsSync(targetJsPath)) {
    fs.writeFileSync(targetJsPath, "\n");
  }

  const contentHTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${data.title}</title>
    <meta name="description" content="${data.desc}" />
    <meta name="robots" content="index, follow" />
    ${data.ogTags}
    <link rel="canonical" href="https://www.ezheatandair.com/${slug}" />
    
    <link rel="stylesheet" href="../pages/${slug}/${slug}.css" />

    ${data.schemas}
  </head>
  <body>
    <div class="page-wrapper">
      {{header}}

      <div class="blog-detail-page">
        <div class="breadcrumbs4 px-0">
          <div class="container">
            <div class="breadcrumbs5">
              <div class="home-group">
                <a class="home7" href="../../index.html">Home</a>
                <img
                  class="chevron-right-double-icon3"
                  loading="lazy"
                  alt=""
                  src="../../assets/images/blog/chevronrightdouble.svg"
                  width="24"
                  height="24"
                 decoding="async" fetchpriority="high" />
                <a
                  style="font-weight: normal"
                  class="latest-news"
                  href="blog.html"
                  >Blog</a
                >
                <img
                  class="chevron-right-double-icon4"
                  alt=""
                  src="../../assets/images/blog/chevronrightdouble.svg"
                  width="24"
                  height="24"
                 decoding="async" />
                <a style="font-weight: normal" class="latest-news" href="#"
                  >${data.categoryName}</a
                >
                <img
                  class="chevron-right-double-icon4"
                  alt=""
                  src="../../assets/images/blog/chevronrightdouble.svg"
                  width="24"
                  height="24"
                 decoding="async" />
              </div>
              <div class="why-do-slab-leaks-occur-mostly-wrapper">
                <div class="why-do-slab">${data.breadcrumbTitle}</div>
              </div>
            </div>
          </div>
        </div>

        <main class="container blog-details">
          <div class="frame-main px-0">
            <section class="why-do-slab-leaks-occur-mostly-parent">
              ${data.articleSectionHTML}
            </section>

            <div class="frame-parent32">
              <div class="text-group">
                <div class="text83">Category</div>
                <div class="frame-child44"></div>
                <div class="categorys-col">
                  <div class="frame-parent33">
                    <a class="text-wrapper" href="#"><div class="text84">Water Heater</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Wall Heater</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Plumbing</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Indoor Air Quality</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">HVAC Services</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Home Maintenance</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Heating Service</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Heat Pump Services</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Dryer Vent Cleaning</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Air Duct Cleaning</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">Air Conditioning</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">AC Tune-Up Service</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">AC Thermostat</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">AC Filter Cleaning</div></a>
                    <a class="text-wrapper" href="#"><div class="text84">AC Coil Cleaning</div></a>
                  </div>
                </div>
              </div>
              <div class="text-parent1">
                <div class="text92">Recent Posts</div>
                <div class="frame-child45"></div>
                <div class="recent-posts">
                  <div class="recent-post-item">
                    <img
                      src="../../assets/images/blog/stay-warm-winter.webp"
                      alt="Stay Warm This Winter"
                     decoding="async" width="825" height="388" loading="lazy" />
                    <a
                      href="../stay-warm-this-winter-top-heating-repair-services-in-san-diego-ca/content.html"
                      >Stay Warm This Winter: Top Heating Repair Services in San
                      Diego CA</a
                    >
                  </div>
                  <div class="recent-post-item">
                    <img
                      src="../../assets/images/blog/sd-climate-water-heater-performance.webp"
                      alt="San Diego Climate Water Heater"
                     decoding="async" width="825" height="388" loading="lazy" />
                    <a
                      href="../how-san-diego-climate-affects-water-heater-performance/content.html"
                      >How San Diego's Climate Affects Water Heater
                      Performance</a
                    >
                  </div>
                  <div class="recent-post-item">
                    <img
                      src="../../assets/images/blog/hvac-repair-sd-tips.webp"
                      alt="HVAC Repair San Diego"
                     decoding="async" width="771" height="362" loading="lazy" />
                    <a
                      href="../hvac-repair-in-san-diego-essential-tips-to-keep-your-system-running-smoothly/content.html"
                      >HVAC Repair in San Diego, CA: Essential Tips to Keep Your
                      System Running Smoothly</a
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div class="blog-share-wrapper pt-0">
          <div class="container">
            <p class="com-para">Share This Article</p>
            <div class="share-group">
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="facebook" title="Share on Facebook" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/facebook-share-icon.svg" />
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="twitter" title="Share on X" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/twitter-share-icon.svg" />
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="linkedin" title="Share on LinkedIn" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/linkedin-share-icon.svg" />
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="email" title="Share on Email" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/email-share-icon.svg" />
                </button>
              </span>
            </div>
          </div>
        </div>
        <div class="container latest-blog-container">
          <div class="related-posts-parent px-0">
            <div class="related-posts">Related Posts</div>
            <div class="p-0 container">
              <div class="slick-slider latest-blog-slider row slick-initialized" dir="ltr">
                <div class="slick-list">
                  <div class="slick-track" style="width:0%;left:0%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {{footer}}
    </div>
    {{footer-scripts}}
  </body>
</html>
`;

  fs.writeFileSync(path.join(pageDir, "content.html"), contentHTML);
  console.log(`Successfully generated ${slug}/content.html`);
}

async function main() {
  try {
    let slugsToMigrate = [];

    // Test mode: if a specific slug is passed
    const specificSlug = process.argv[2];
    if (specificSlug) {
      slugsToMigrate.push(specificSlug);
      console.log("Running in specific slug mode: " + specificSlug);
    } else {
      console.log("Fetching Popular Posts API...");
      for (let page = 1; page <= 11; page++) {
        const apiURL = `https://ezapi.ezheatandair.com/getMostpopular/?pageIndex=${page}&pageSize=10&search=`;
        const res = await fetch(apiURL, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            for (const post of data.data) {
              if (post.slug) {
                const pageDir = path.join(BASE_PAGES_DIR, post.slug);
                if (!fs.existsSync(pageDir)) {
                  slugsToMigrate.push(post.slug);
                }
              }
            }
          }
        }
      }
      console.log(
        `Found ${slugsToMigrate.length} missing detail pages to migrate.`,
      );
    }

    for (let i = 0; i < slugsToMigrate.length; i++) {
      const slug = slugsToMigrate[i];
      console.log(`[${i + 1}/${slugsToMigrate.length}] Migrating: ${slug}`);
      const data = await scrapePage(slug);
      if (data) {
        await generateLocalPage(slug, data);
      }
      // Small delay to be gentle on the server
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log("Done migrating details!");
  } catch (err) {
    console.error("Migration fatal error:", err);
  }
}

main();
