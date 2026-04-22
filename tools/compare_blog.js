const fs = require("fs");
const cheerio = require("cheerio");

async function check() {
  const response = await fetch(
    "https://www.ezheatandair.com/guide-to-maintain-your-heating-system",
  );
  const html = await response.text();
  const $live = cheerio.load(html);
  const $local = cheerio.load(
    fs.readFileSync("dist/guide-to-maintain-your-heating-system.html"),
  );

  console.log("--- LIVE SITE ---");
  console.log("Title:", $live("h1").text().trim());
  console.log(
    "Author/Meta:",
    $live(".blog-detail-content").text().includes("cabral")
      ? "Has Author text"
      : "No Author text",
  );
  console.log(
    "H2s:",
    $live(".blog-detail-content h2, .blog-detail-content h3")
      .map((i, el) => $live(el).text().trim())
      .get(),
  );

  // Actually, on live site, let's just dump ALL text in the main content container to see what's different.
  const liveContent =
    $live(".blog-detail-content").text() || $live(".post-content").text() || "";
  const localContent = $local(".post-injected-content").text() || "";

  console.log("\n--- CONTENT LENGTH ---");
  console.log("Live Content Length:", liveContent.length);
  console.log("Local Content Length:", localContent.length);

  // Check for the dynamically injected text
  console.log("\n--- SPECIFIC SECTIONS ---");
  console.log("Live has P tags:", $live(".blog-detail-content p").length);
  console.log("Local has P tags:", $local(".post-injected-content p").length);

  // Check for author box
  console.log(
    "Author block exists live?:",
    $live(".blog-detail-author").length > 0 ||
      $live("a[href*='cabral']").length > 0,
  );
  console.log(
    "Author block exists local?:",
    $local(".blog-detail-author").length > 0 ||
      $local("a[href*='cabral']").length > 0,
  );

  // Let's just log the H2s/H3s
  console.log("\nLive headings:");
  $live("h2, h3, .blog_sandiego_title, strong").each((i, el) => {
    if ($live(el).text().trim()) {
      // console.log($live(el).prop('tagName'), $live(el).text().trim().substring(0, 50));
    }
  });

  // Specifically check what paragraph tags the live site has that might be missing
  console.log("\nDifferences?");
}
check();
