const fs = require("fs");
let html = fs.readFileSync("pages/home/content.html", "utf8");

const headEnd = "</head>";
if (html.includes(headEnd) && !html.includes("header.css")) {
  html = html.replace(
    headEnd,
    '    <link rel="stylesheet" href="../../shared/css/header.css" />\n  </head>',
  );
  fs.writeFileSync("pages/home/content.html", html);
  console.log("Added header.css link to content.html");
}
