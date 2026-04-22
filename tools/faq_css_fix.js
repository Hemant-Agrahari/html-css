const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pagesDir = path.join(__dirname, "../pages");
const pages = fs.readdirSync(pagesDir);

const cssOverride = `\n/* Blog and FAQ Section Alignment */
.signs-of-a-slab-leak-parent .signs-of-a {
    font-family: inherit;
    font-size: 28px !important;
    font-weight: 600 !important;
    color: #2d2d2d !important;
    line-height: 40.32px !important;
    margin: 0px 0px 20px 0px !important;
}

.signs-of-a-slab-leak-parent .text50 h3 {
    font-family: inherit;
    font-size: 20px !important;
    font-weight: 600 !important;
    color: #333333 !important;
    line-height: normal !important;
    margin: 16px 0px 8px 0px !important;
}

.signs-of-a-slab-leak-parent .text50 p {
    font-family: inherit;
    font-size: 16px !important;
    font-weight: 400 !important;
    color: #333333 !important;
    line-height: 26px !important;
    margin: 0px 0px 16px 0px !important;
}

.signs-of-a-slab-leak-parent .text50 ul li {
    font-family: inherit;
    font-size: 16px !important;
    font-weight: 400 !important;
    color: #333333 !important;
    line-height: 26px !important;
}
`;

pages.forEach((page) => {
  // Check if css exists
  const cssPath = path.join(pagesDir, page, page + ".css");
  if (fs.existsSync(cssPath)) {
    let cssContent = fs.readFileSync(cssPath, "utf8");
    // Check if override already exists to avoid duplicates
    if (!cssContent.includes("/* Blog and FAQ Section Alignment */")) {
      fs.writeFileSync(cssPath, cssContent + cssOverride);
      console.log(`Updated CSS for ${page}`);
    }

    try {
      console.log(`Rebuilding ${page}`);
      execSync(`node build.js --page=${page}`, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to build ${page}`);
    }
  }
});
console.log("All CSS updated and pages rebuilt successfully.");
