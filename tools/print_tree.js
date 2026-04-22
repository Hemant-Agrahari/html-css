const fs = require("fs");
const cheerio = require("cheerio");

const rawHtml = fs.readFileSync("/tmp/scraper/la_emergency_raw.html", "utf8");
const $ = cheerio.load(rawHtml);

function printTree(node, depth = 0) {
  if (depth > 6) return;
  const children = $(node).children();
  children.each((i, el) => {
    const tagName = el.tagName;
    const className = $(el).attr("class");
    if (tagName !== "script" && tagName !== "style") {
      console.log(
        " ".repeat(depth * 2) +
          `<${tagName}${className ? ' class="' + className + '"' : ""}>`,
      );
      printTree(el, depth + 1);
    }
  });
}

const main = $(".serviceTemplate").length
  ? $(".serviceTemplate")
  : $("main").length
    ? $("main")
    : $("body");
printTree(main[0]);
