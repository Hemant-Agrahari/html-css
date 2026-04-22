const fs = require("fs");

function fixPaths(filePath, newSlug) {
  let content = fs.readFileSync(filePath, "utf8");
  content = content.replace(
    /\/pages\/24-7-emergency-services\//g,
    `/pages/${newSlug}/`,
  );
  fs.writeFileSync(filePath, content);
}

fixPaths(
  "/home/shawn/ez-plumbing-next-to-html/ezheatandair/pages/los-angeles-emergency-plumbing-services/content.html",
  "los-angeles-emergency-plumbing-services",
);
fixPaths(
  "/home/shawn/ez-plumbing-next-to-html/ezheatandair/pages/orange-county-heating-repair/content.html",
  "orange-county-heating-repair",
);

console.log("Path replacements completed successfully.");
