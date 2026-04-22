const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pagesDir = path.join(__dirname, "../pages");
const pages = fs.readdirSync(pagesDir);

const blogPages = pages.filter((p) =>
  fs.existsSync(path.join(pagesDir, p, "content.html")),
);

blogPages.forEach((page) => {
  const filePath = path.join(pagesDir, page, "content.html");
  let content = fs.readFileSync(filePath, "utf8");

  // Replace literal '\n ' with nothing
  content = content.replace(/\\n\s*{{footer}}/g, "{{footer}}");
  content = content.replace(/\\n/g, "");

  // Correct social icon paths
  content = content.replace(
    /..\/..\/assets\/images\/blog\/facebook\.png/g,
    "../../assets/images/facebook.webp",
  );
  content = content.replace(
    /..\/..\/assets\/images\/blog\/twitter\.png/g,
    "../../assets/images/twitter.webp",
  );
  content = content.replace(
    /..\/..\/assets\/images\/blog\/linkedin\.svg/g,
    "../../assets/images/linkedin.svg",
  );

  fs.writeFileSync(filePath, content);

  console.log(`Fixed formatting and icons for ${page}`);
  try {
    execSync(`node build.js --page=${page}`, { stdio: "inherit" });
  } catch (e) {
    console.error(`Failed to build ${page}`);
  }
});

console.log("All fixes applied and pages rebuilt.");
