const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pagesDir = path.join(__dirname, "../pages");
const pages = fs
  .readdirSync(pagesDir)
  .filter((p) => fs.existsSync(path.join(pagesDir, p, "content.html")));

const newShareHtml = `<div class="blog-share-wrapper pt-0">
          <div class="container">
            <p class="com-para">Share This Article</p>
            <div class="share-group">
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="facebook" title="Share on Facebook" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/facebook-share-icon.svg"/>
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="twitter" title="Share on X" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/twitter-share-icon.svg"/>
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="linkedin" title="Share on LinkedIn" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/linkedin-share-icon.svg"/>
                </button>
              </span>
              <span class="icon-box">
                <button class="react-share__ShareButton" style="background-color:transparent;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">
                  <img alt="email" title="Share on Email" loading="lazy" width="32" height="32" decoding="async" data-nimg="1" style="color:transparent" src="../../assets/images/email-share-icon.svg"/>
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
                  <div class="slick-track" style="width:0%;left:NaN%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;

blogPages = pages; // all pages that have content.html

blogPages.forEach((page) => {
  const filePath = path.join(pagesDir, page, "content.html");
  let content = fs.readFileSync(filePath, "utf8");

  // Extract the old blog-share-wrapper to replace it
  const startIdx = content.indexOf('<div class="blog-share-wrapper pt-0">');
  if (startIdx !== -1) {
    // The old blog-share-wrapper ends right before \n {{footer}} or \n      \n {{footer}}
    // Let's just find the closing tags appropriately.
    // We can just use a regex across multiple lines.
    const regex =
      /<div class="blog-share-wrapper pt-0">[\s\S]*?(?=\{\{footer\}\})/g;
    content = content.replace(regex, newShareHtml + "\n      ");
    fs.writeFileSync(filePath, content);
    console.log(`Updated share module for ${page}`);
    try {
      execSync(`node build.js --page=${page}`, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to build ${page}`);
    }
  }
});

console.log("Finished updating share icons.");
