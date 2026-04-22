const fs = require("fs");

// Read source files
let gasContent = fs.readFileSync(
  "pages/san-diego-gas-line-repair-replacement/content.html",
  "utf8",
);
let gasCss = fs.readFileSync(
  "pages/san-diego-gas-line-repair-replacement/san-diego-gas-line-repair-replacement.css",
  "utf8",
);
let gasJs = fs.readFileSync(
  "pages/san-diego-gas-line-repair-replacement/san-diego-gas-line-repair-replacement.js",
  "utf8",
);

// Read target files
let aboutContent = fs.readFileSync("pages/about-us/content.html", "utf8");

let aboutJs = "/* About Us Scripts */\n$(document).ready(function () {\n";

// 1. Extract HTML
let promoHtml = gasContent
  .match(/<section class="promo-section py-5">[\s\S]*?<\/section>/)[0]
  .replace(/pages\/san-diego-gas-line-repair-replacement/g, "pages/about-us")
  .replace(
    /\.\.\/\.\.\/assets\/images\/247-service\.png/g,
    "../../pages/about-us/assets/247-service.webp",
  );

let ctaHtml = gasContent.match(
  /<section class="promo-strip text-center">[\s\S]*?<\/section>/,
)[0];

let testiHtml = gasContent
  .match(/<section class="py-5 testimonials-section">[\s\S]*?<\/section>/)[0]
  .replace(/pages\/san-diego-gas-line-repair-replacement/g, "pages/about-us");

// Inject into About Us right before </main>
aboutContent = aboutContent.replace(
  /<\/main>/,
  promoHtml + "\n\n" + ctaHtml + "\n\n" + testiHtml + "\n</main>",
);

// Inject Slick CSS and JS if completely missing
if (!aboutContent.includes("slick.css")) {
  aboutContent = aboutContent.replace(
    "</head>",
    `    <!-- Slick Carousel CSS -->\n    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css" />\n    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css" />\n  </head>`,
  );
}
if (!aboutContent.includes("slick.min.js")) {
  aboutContent = aboutContent.replace(
    "</body>",
    `    <!-- jQuery and Slick JS -->\n    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>\n    <script src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>\n  </body>`,
  );
}

fs.writeFileSync("pages/about-us/content.html", aboutContent);

// 2. Extract CSS
let slickUtilsCss = gasCss
  .match(
    /\/\* Slick Utility Styles \*\/[\s\S]*?\/\* Utility section title \*\//,
  )[0]
  .replace("/* Utility section title */", "");
let promoCss = gasCss
  .match(
    /\/\* ==========================================================================\n   6\. Promo Section CSS[\s\S]*?\/\* ==========================================================================/,
  )[0]
  .replace(
    /\/\* ==========================================================================\s*$/,
    "",
  );
let ctaCss = gasCss
  .match(
    /\/\* ==========================================================================\n   7\. CTA Banner CSS[\s\S]*?\/\* ==========================================================================/,
  )[0]
  .replace(
    /\/\* ==========================================================================\s*$/,
    "",
  );
let testiCss = gasCss
  .match(
    /\/\* ==========================================================================\n   8\. Testimonials CSS[\s\S]*?\/\* ==========================================================================/,
  )[0]
  .replace(
    /\/\* ==========================================================================\s*$/,
    "",
  );

let combinedCss = `\n${slickUtilsCss}\n${promoCss}\n${ctaCss}\n${testiCss}\n`;
fs.appendFileSync("pages/about-us/about-us.css", combinedCss);

// 3. Extract JS
let promoJs = gasJs.match(
  /\$\("\.promo-carousel"\)\.slick\(\{[\s\S]*?\}\);/,
)[0];
let testiJs = gasJs.match(
  /\$\("\.testimonial-carousel"\)\.slick\(\{[\s\S]*?\}\);/,
)[0];

fs.writeFileSync(
  "pages/about-us/about-us.js",
  aboutJs + "  " + promoJs + "\n\n  " + testiJs + "\n});\n",
);
