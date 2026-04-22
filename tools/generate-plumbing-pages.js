const fs = require("fs");
const path = require("path");

const routes = [
  "gas-line-repair-replacement",
  "hose-outdoor-faucet-services",
  "leak-repair",
  "repipe-pipelining",
  "slab-leaks",
  "sump-pumps",
  "plumbing-installation-replacement",
  "shut-off-valve-repair",
  "tankless-water-heaters",
  "water-conservation",
  "water-filtration",
  "water-heaters",
  "water-pressure-regulators",
  "water-softeners",
  "water-treatment-services",
];

routes.forEach((route) => {
  const pageDir = path.join(__dirname, "..", "pages", route);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  const title = route
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const htmlContent = `---
title: ${title}
css: ${route}.css
js: ${route}.js
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - EZ Heat & Air</title>
    {{head-meta}}
    <link rel="stylesheet" href="../../pages/${route}/${route}.css" />
    <style>body { font-family: "Outfit", sans-serif; }</style>
  </head>
  <body>
    <div class="page-wrapper">
      {{header}}
      <main style="min-height: 50vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
         <h1 style="color: #31a05b;">${title}</h1>
         <p>This is the placeholder content for ${title}.</p>
      </main>
      {{footer}}
    </div>
    {{footer-scripts}}
    <script src="../../pages/${route}/${route}.js"></script>
  </body>
</html>`;

  fs.writeFileSync(path.join(pageDir, "content.html"), htmlContent);
  fs.writeFileSync(
    path.join(pageDir, `${route}.css`),
    `/* CSS for ${route} */\n`,
  );
  fs.writeFileSync(path.join(pageDir, `${route}.js`), `// JS for ${route}\n`);

  console.log(`Generated template for ${route}`);
});

// Now update header.html links
const headerPath = path.join(
  __dirname,
  "..",
  "shared",
  "components",
  "header.html",
);
let headerContent = fs.readFileSync(headerPath, "utf8");

routes.forEach((route) => {
  const regex = new RegExp(`href="/${route}"`, "g");
  headerContent = headerContent.replace(regex, `href="${route}.html"`);
});

fs.writeFileSync(headerPath, headerContent);
console.log("Updated header.html links successfully!");
