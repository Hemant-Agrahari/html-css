const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

function detectJsModules(html) {
  return "";
}

function injectImageOptimization($, yamlData) {
  const GEN_DIR = path.join(__dirname, "assets/images/generated");
  const IMAGES_BASE_PATH = "../assets/images/";
  const GEN_BASE_PATH = "../assets/images/generated/";

  // 1. Handle <img> tags (srcset, sizes, loading, decoding)
  $("img").each((i, el) => {
    const $img = $(el);
    const src = $img.attr("src") || "";

    // Set defaults for all images
    $img.attr("loading", "lazy");
    $img.attr("decoding", "async");

    if (src.includes("assets/images/") && !src.includes("generated/")) {
      const fileName = path.basename(src);
      const nameOnly = path.parse(fileName).name;
      const srcsetArr = [];

      // Check for responsive versions
      if (fs.existsSync(path.join(GEN_DIR, `${nameOnly}-375w.webp`))) {
        srcsetArr.push(`${GEN_BASE_PATH}${nameOnly}-375w.webp 375w`);
      }
      if (fs.existsSync(path.join(GEN_DIR, `${nameOnly}-768w.webp`))) {
        srcsetArr.push(`${GEN_BASE_PATH}${nameOnly}-768w.webp 768w`);
      }

      if (srcsetArr.length > 0) {
        $img.attr("srcset", srcsetArr.join(", "));
        $img.attr("sizes", "(max-width: 768px) 100vw, 768px");
      }
    }
  });

  // 2. Handle LCP Image (fetchpriority="high", loading="eager")
  if (yamlData.lcp_img) {
    const lcpSrcSnippet = yamlData.lcp_img;
    const $lcpImg = $(`img[src*="${lcpSrcSnippet}"]`);
    $lcpImg.attr("fetchpriority", "high");
    $lcpImg.attr("loading", "eager");
    $lcpImg.attr("decoding", "sync");
  }

  // 3. Handle LCP Background Preloads
  if (yamlData.lcp_bg_desktop) {
    const bgUrl = yamlData.lcp_bg_desktop.startsWith("http")
      ? yamlData.lcp_bg_desktop
      : yamlData.lcp_bg_desktop.startsWith("assets")
        ? `../${yamlData.lcp_bg_desktop}`
        : yamlData.lcp_bg_desktop;

    $("head").append(
      `    <link rel="preload" as="image" href="${bgUrl}" fetchpriority="high" />\n`,
    );
  }
}

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

  // Extract head content from content.html if it exists
  let pageHeadContent = "";
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    pageHeadContent = headMatch[1];
    // Remove the original head from html to avoid duplication
    html = html.replace(/<head>[\s\S]*?<\/head>/i, "");
  }

  const componentsDir = path.join(__dirname, "shared", "components");
  const getComponent = (name) => {
    const compPath = path.join(componentsDir, `${name}.html`);
    return fs.existsSync(compPath) ? fs.readFileSync(compPath, "utf8") : "";
  };

  // Re-assemble the head with strict order (Mandated by rules)
  const headMeta = getComponent("head-meta");
  const header = getComponent("header");

  // 1. Technical Tags (Charset, Viewport)
  const technicalTags = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />`.trim();

  // 2. Brand Tags (Title, Meta Description)
  const titleMatch = pageHeadContent.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[0]
    : `<title>${yamlData.title || pageName} | EZ Heat & Air</title>`;

  const metaDescMatch = pageHeadContent.match(
    /<meta\s+name="description"\s+content="([\s\S]*?)"\s*\/?>/i,
  );
  // Default meta description if missing
  const defaultDesc =
    "EZ Heat & Air offers expert HVAC services, air conditioning repair, heating installation, and plumbing in San Diego. Contact us today for reliable service!";
  const metaDesc = metaDescMatch
    ? metaDescMatch[0]
    : `<meta name="description" content="${yamlData.description || defaultDesc}" />`;

  // 3. Social Tags (OG, Twitter)
  const ogTagsMatch = pageHeadContent.match(
    /<meta\s+(property|name)="(og|twitter):[\s\S]*?"\s+content="[\s\S]*?"\s*\/?>/gi,
  );
  const ogTags = ogTagsMatch
    ? ogTagsMatch.map((t) => t.trim()).join("\n    ")
    : "";

  // 4. Other tags (clean up pageHeadContent)
  let cleanedPageHead = pageHeadContent
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/?>/i, "")
    .replace(/<meta\s+charset="[\s\S]*?"\s*\/?>/i, "")
    .replace(/<meta\s+name="viewport"[\s\S]*?\/?>/i, "")
    .replace(
      /<meta\s+(property|name)="(og|twitter):[\s\S]*?"\s+content="[\s\S]*?"\s*\/?>/gi,
      "",
    )
    .replace(/{{head-meta}}/g, "")
    .trim();

  const finalHead = `
  <head>
    ${technicalTags}
    ${title}
    ${metaDesc}
    ${ogTags}
    ${headMeta}
    ${cleanedPageHead}
  </head>`.trim();

  // Inject the final head back into the html (assuming <html> starts the file)
  if (html.includes("<html")) {
    html = html.replace(/<html([\s\S]*?)>/i, `<html$1>\n  ${finalHead}`);
  } else {
    html = `<!doctype html>\n<html lang="en">\n  ${finalHead}\n${html}\n</html>`;
  }

  // Replace markers
  html = html.replace(/{{header}}/g, header);
  // Re-run component replacement for any markers left in the body
  if (fs.existsSync(componentsDir)) {
    const components = fs
      .readdirSync(componentsDir)
      .filter((f) => f.endsWith(".html"));
    components.forEach((comp) => {
      const name = comp.replace(".html", "");
      const marker = `{{${name}}}`;
      if (html.includes(marker)) {
        html = html.split(marker).join(getComponent(name));
      }
    });
  }

  const jsModules = detectJsModules(html);
  html = html.replace("{{js_modules}}", jsModules);

  const baseUrl = "https://www.ezheatandair.com";
  const pageUrl = pageName === "home" ? "" : `${pageName}`;
  const canonicalUrl = `${baseUrl}/${pageUrl}`;
  const canonicalLink = `<link rel="canonical" href="${canonicalUrl}" />`;
  html = html.split("{{canonical}}").join(canonicalLink);

  // Update paths for dist/ (root level)
  html = html.replace(/\.\.\/\.\.\/assets\//g, "assets/");
  html = html.replace(/\.\.\/\.\.\/shared\//g, "shared/");
  html = html.replace(/\.\.\/\.\.\/components\//g, "components/");
  html = html.replace(/\.\.\/\.\.\/pages\//g, "pages/");
  html = html.replace(/\.\.\/\.\.\/([a-zA-Z0-9_-]+\.html)/g, "$1");

  // Fix local CSS reference targeting home.css
  html = html.replace(
    /href="\.\/home\.css"/g,
    `href="../pages/${pageName}/home.css"`,
  );
  // Fix page stylesheet if passed in frontmatter
  if (yamlData.css) {
    const cssPath = `../pages/${pageName}/${yamlData.css}`;
    if (!html.includes(cssPath)) {
      html = html.replace(
        "</head>",
        `    <link rel="stylesheet" href="${cssPath}" />\n  </head>`,
      );
    }
  }

  if (!fs.existsSync(path.join(__dirname, "dist"))) {
    fs.mkdirSync(path.join(__dirname, "dist"));
  }

  const $ = cheerio.load(html);

  // Apply Phase 6 Optimization
  injectImageOptimization($, yamlData);

  const destName = pageName === "home" ? "index.html" : `${pageName}.html`;
  const distPath = path.join(__dirname, "dist", destName);

  // Final HTML after Cheerio modifications
  let finalHtml = $.html();

  // Final path corrections on the markup
  finalHtml = finalHtml.replace(/\.\.\/\.\.\/assets\//g, "assets/");
  finalHtml = finalHtml.replace(/\.\.\/\.\.\/shared\//g, "shared/");
  finalHtml = finalHtml.replace(/\.\.\/\.\.\/components\//g, "components/");
  finalHtml = finalHtml.replace(/\.\.\/\.\.\/pages\//g, "pages/");
  finalHtml = finalHtml.replace(/\.\.\/\.\.\/([a-zA-Z0-9_-]+\.html)/g, "$1");

  // Fix local CSS reference targeting home.css
  finalHtml = finalHtml.replace(
    /href="\.\/home\.css"/g,
    `href="../pages/${pageName}/home.css"`,
  );

  fs.writeFileSync(distPath, finalHtml);
  console.log(`Generated ${distPath}`);
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

// Ensure Vercel has all assets in dist
const copyRecursiveSync = function(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
};

console.log("Copying static assets for server deployment...");
copyRecursiveSync(path.join(__dirname, "assets"), path.join(__dirname, "dist", "assets"));
copyRecursiveSync(path.join(__dirname, "shared"), path.join(__dirname, "dist", "shared"));
copyRecursiveSync(path.join(__dirname, "pages"), path.join(__dirname, "dist", "pages"));
console.log("Build complete.");
