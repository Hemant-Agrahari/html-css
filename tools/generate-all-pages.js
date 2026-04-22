const fs = require("fs");
const path = require("path");

const headerPath = path.join(
  __dirname,
  "..",
  "shared",
  "components",
  "header.html",
);
let headerContent = fs.readFileSync(headerPath, "utf8");

const footerPath = path.join(
  __dirname,
  "..",
  "shared",
  "components",
  "footer.html",
);
let footerContent = fs.readFileSync(footerPath, "utf8");

// Match all href="/something" or href="something.html" where something has no dot or slash or #
const routeRegex = /href="(?:\/)?([^"\.\/#]+)(?:\.html)?"/g;

let match;
const uniqueRoutes = new Set();
while ((match = routeRegex.exec(headerContent)) !== null) {
  if (match[1] !== "index") uniqueRoutes.add(match[1]);
}
while ((match = routeRegex.exec(footerContent)) !== null) {
  if (match[1] !== "index") uniqueRoutes.add(match[1]);
}

uniqueRoutes.forEach((route) => {
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

  // Replace in contents!
  const replacer = new RegExp(`href="/${route}"`, "g");
  headerContent = headerContent.replace(replacer, `href="${route}.html"`);
  footerContent = footerContent.replace(replacer, `href="${route}.html"`);
});

fs.writeFileSync(headerPath, headerContent);
fs.writeFileSync(footerPath, footerContent);
console.log("Updated links in header and footer successfully!");
