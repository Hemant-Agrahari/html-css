const fs = require("fs");
const path = require("path");

function buildPage(pageName) {
  console.log(`Building page: ${pageName}`);
  const contentPath = path.join(__dirname, "pages", pageName, "content.html");
  if (!fs.existsSync(contentPath)) return;

  let html = fs.readFileSync(contentPath, "utf8");

  let yamlData = {};
  if (html.startsWith("---")) {
    const endMatch = html.indexOf("---", 3);
    if (endMatch !== -1) {
      const frontmatter = html.substring(3, endMatch).trim();
      frontmatter.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          yamlData[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      });
      html = html.substring(endMatch + 3).trim();
    }
  }

  const componentsDir = path.join(__dirname, "shared", "components");
  if (fs.existsSync(componentsDir)) {
    const components = fs
      .readdirSync(componentsDir)
      .filter((f) => f.endsWith(".html"));
    components.forEach((comp) => {
      const name = comp.replace(".html", "");
      const marker = `{{${name}}}`;
      if (html.includes(marker)) {
        const content = fs.readFileSync(path.join(componentsDir, comp), "utf8");
        html = html.split(marker).join(content);
      }
    });
  }

  // Update paths for dist/ indexing (dist/ is 1 depth level into repo)
  // pages/home/content.html is 2 depth levels.
  // We need to decrease depth from ../../ to ../
  html = html.replace(/\.\.\/\.\.\/assets\//g, "../assets/");
  html = html.replace(/\.\.\/\.\.\/shared\//g, "../shared/");
  html = html.replace(/\.\.\/\.\.\/components\//g, "../components/");
  html = html.replace(/\.\.\/\.\.\/pages\//g, "../pages/");

  // Fix local CSS reference targeting home.css
  html = html.replace(
    /href="\.\/home\.css"/g,
    `href="../pages/${pageName}/home.css"`,
  );

  if (!fs.existsSync(path.join(__dirname, "dist"))) {
    fs.mkdirSync(path.join(__dirname, "dist"));
  }

  const destName = pageName === "home" ? "index.html" : `${pageName}.html`;
  fs.writeFileSync(path.join(__dirname, "dist", destName), html);
  console.log(`Generated dist/${destName}`);
}

const args = process.argv.slice(2);
let pageToBuild = "all";
args.forEach((arg) => {
  if (arg.startsWith("--page=")) {
    pageToBuild = arg.split("=")[1];
  }
});

if (pageToBuild === "all") {
  const pagesDir = path.join(__dirname, "pages");
  if (fs.existsSync(pagesDir)) {
    fs.readdirSync(pagesDir).forEach((page) => buildPage(page));
  }
} else {
  buildPage(pageToBuild);
}
