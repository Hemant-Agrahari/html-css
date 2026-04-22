const cheerio = require("cheerio");
const fs = require("fs");
fetch("https://www.ezheatandair.com/guide-to-maintain-your-heating-system")
  .then((res) => res.text())
  .then((html) => {
    const $1 = cheerio.load(html);
    const $2 = cheerio.load(
      fs.readFileSync("dist/guide-to-maintain-your-heating-system.html"),
    );

    console.log("--- LIVE SITE ---");
    console.log(
      "Heading 2 / 3 text block count:",
      $1(".blog-detail-content h2, .blog-detail-content h3").length ||
        $1("article h2, article h3").length,
    );
    if ($1(".blog-detail-content").length === 0) {
      console.log(
        "Live site content container uses:",
        $1("article").length ? "article" : "something else",
      );
    }

    console.log("\n--- LIVE CONTENT SECTIONS ---");
    $1("article p, article h2, article h3, article strong").each((i, el) => {
      let text = $1(el).text().trim();
      if (text && text.length < 100) {
        // Just dump titles to see what's there
        console.log($1(el).prop("tagName"), text);
      }
    });

    console.log("\n--- LOCAL CONTENT SECTIONS ---");
    $2(
      ".post-injected-content p, .post-injected-content h2, .post-injected-content h3, .post-injected-content strong, .post-injected-content .blog_sandiego_title",
    ).each((i, el) => {
      let text = $2(el).text().trim();
      if (text && text.length < 100) {
        console.log($2(el).prop("tagName"), text);
      }
    });
  });
