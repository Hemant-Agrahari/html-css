const fs = require("fs");

let html = fs.readFileSync("pages/home/content.html", "utf8");

// Replace header block
const headerStart = '<header class="page-header bg-white sticky-top">';
const headerEnd = "</header>";
const headerStartIndex = html.indexOf(headerStart);
const headerEndIndex =
  html.indexOf(headerEnd, headerStartIndex) + headerEnd.length;

if (headerStartIndex !== -1 && headerEndIndex > headerStartIndex) {
  html =
    html.substring(0, headerStartIndex) +
    "{{header}}" +
    html.substring(headerEndIndex);
}

// Replace footer block
const footerStart = '<footer class="new-footer">';
const footerEnd = "</footer>";
const footerStartIndex = html.indexOf(footerStart);
const footerEndIndex =
  html.indexOf(footerEnd, footerStartIndex) + footerEnd.length;

if (footerStartIndex !== -1 && footerEndIndex > footerStartIndex) {
  html =
    html.substring(0, footerStartIndex) +
    "{{footer}}" +
    html.substring(footerEndIndex);
}

// Write it back
fs.writeFileSync("pages/home/content.html", html);
console.log(
  "Successfully replaced header and footer with markers in content.html",
);
