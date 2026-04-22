const fs = require("fs");
const cssPath = "pages/home/home.css";
const cssLines = fs.readFileSync(cssPath, "utf8").split("\n");

const homeCss = cssLines.slice(0, 339).join("\n");
const headerCss = cssLines.slice(339).join("\n");

fs.mkdirSync("shared/css", { recursive: true });
fs.writeFileSync("shared/css/header.css", headerCss);
fs.writeFileSync(cssPath, homeCss);

console.log("Extracted header.css correctly.");
