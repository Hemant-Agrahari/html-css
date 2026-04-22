const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pagesDir = path.join(__dirname, "../pages");
const pages = fs
  .readdirSync(pagesDir)
  .filter((p) => fs.statSync(path.join(pagesDir, p)).isDirectory());

pages.forEach((page) => {
  const cssPath = path.join(pagesDir, page, page + ".css");
  if (fs.existsSync(cssPath)) {
    let cssContent = fs.readFileSync(cssPath, "utf8");

    const splitString = "/* Blog and FAQ Section Alignment */";
    if (cssContent.includes(splitString)) {
      // Revert by taking everything before the appended string
      cssContent = cssContent.split(splitString)[0].trimEnd();
      fs.writeFileSync(cssPath, cssContent);
      console.log(`Reverted CSS for ${page}`);
      try {
        execSync(`node build.js --page=${page}`, { stdio: "ignore" });
      } catch (e) {
        console.error(`Failed to build ${page}`);
      }
    }
  }
});
console.log("All CSS modifications reverted and pages rebuilt.");
