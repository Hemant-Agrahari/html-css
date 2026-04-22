const fs = require("fs");
const path = require("path");

const PAGES_DIR = path.join(__dirname, "../pages");

function fixHeadMeta() {
  const dirs = fs.readdirSync(PAGES_DIR);

  let fixCount = 0;
  for (const dir of dirs) {
    const htmlPath = path.join(PAGES_DIR, dir, "content.html");
    if (!fs.existsSync(htmlPath)) continue;

    let content = fs.readFileSync(htmlPath, "utf8");
    if (content.includes("</head><body>{{head-meta}}")) {
      content = content.replace(
        "</head><body>{{head-meta}}",
        "{{head-meta}}\n</head><body>",
      );
      fs.writeFileSync(htmlPath, content, "utf8");
      fixCount++;
      console.log(`Fixed ${dir}`);
    } else if (content.includes("</head><body>\n    {{head-meta}}")) {
      content = content.replace(
        "</head><body>\n    {{head-meta}}",
        "    {{head-meta}}\n</head><body>",
      );
      fs.writeFileSync(htmlPath, content, "utf8");
      fixCount++;
      console.log(`Fixed ${dir}`);
    } else if (content.includes("</head><body")) {
      // A more general regex to catch it if there are spaces or attributes
      const regex = /<\/head>\s*<body[^>]*>\s*{{head-meta}}/;
      if (regex.test(content)) {
        content = content.replace(
          /<\/head>(\s*<body[^>]*>)\s*{{head-meta}}/,
          "{{head-meta}}\n</head>$1",
        );
        fs.writeFileSync(htmlPath, content, "utf8");
        fixCount++;
        console.log(`Fixed via regex ${dir}`);
      }
    }
  }

  console.log(`Fixed ${fixCount} files.`);
}

fixHeadMeta();
