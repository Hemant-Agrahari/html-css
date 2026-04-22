#!/usr/bin/env node
/**
 * Extracts critical above-fold CSS for the home page using Playwright.
 * Launches a headless browser, loads the page, and determines which CSS rules
 * are needed for above-the-fold rendering on both mobile and desktop.
 * Outputs a minimal CSS string to inline in <head>.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = 5555; // temporary port for extraction

async function extractCritical() {
  // Start a temporary server
  const handler = require('serve-handler');
  const http = require('http');
  const server = http.createServer((req, res) => {
    return handler(req, res, {
      public: DIST,
      cleanUrls: true,
      trailingSlash: false,
    });
  });

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Temp server on port ${PORT}`);

  const browser = await chromium.launch();

  try {
    // Extract for mobile viewport (most constrained)
    const criticalCss = await getCriticalForViewport(browser, 375, 812, `http://localhost:${PORT}/`);
    // Also get desktop
    const desktopCss = await getCriticalForViewport(browser, 1440, 900, `http://localhost:${PORT}/`);

    // Merge both (union of rules)
    const merged = criticalCss + '\n' + desktopCss;

    // Deduplicate
    const unique = [...new Set(merged.split('\n').filter(Boolean))].join('\n');

    console.log(`Critical CSS: ${(unique.length / 1024).toFixed(1)}KB`);

    // Write to file
    const outPath = path.join(DIST, 'css', 'critical-home.css');
    fs.writeFileSync(outPath, unique);
    console.log(`Written: ${outPath}`);

    return unique;
  } finally {
    await browser.close();
    server.close();
  }
}

async function getCriticalForViewport(browser, width, height, url) {
  const page = await browser.newPage({ viewport: { width, height } });

  // Collect all stylesheets
  await page.goto(url, { waitUntil: 'networkidle' });

  const critical = await page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const criticalRules = [];

    // Get all stylesheets
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;

        for (const rule of rules) {
          if (rule.type === CSSRule.STYLE_RULE) {
            // Check if any element matching this selector is above the fold
            try {
              const elements = document.querySelectorAll(rule.selectorText);
              for (const el of elements) {
                const rect = el.getBoundingClientRect();
                if (rect.top < viewportHeight && rect.bottom > 0 && rect.height > 0) {
                  criticalRules.push(rule.cssText);
                  break;
                }
              }
            } catch (e) {
              // Invalid selector, skip
            }
          } else if (rule.type === CSSRule.MEDIA_RULE) {
            // Check if media query matches current viewport
            if (window.matchMedia(rule.conditionText || rule.media.mediaText).matches) {
              const mediaRules = [];
              for (const subRule of rule.cssRules) {
                if (subRule.type === CSSRule.STYLE_RULE) {
                  try {
                    const elements = document.querySelectorAll(subRule.selectorText);
                    for (const el of elements) {
                      const rect = el.getBoundingClientRect();
                      if (rect.top < viewportHeight && rect.bottom > 0 && rect.height > 0) {
                        mediaRules.push(subRule.cssText);
                        break;
                      }
                    }
                  } catch (e) {}
                }
              }
              if (mediaRules.length > 0) {
                const mediaText = rule.conditionText || rule.media.mediaText;
                criticalRules.push(`@media ${mediaText} { ${mediaRules.join(' ')} }`);
              }
            }
          } else if (rule.type === CSSRule.KEYFRAMES_RULE) {
            // Include keyframes referenced by above-fold elements
            const name = rule.name;
            const hasAboveFold = document.querySelector(`[style*="${name}"]`) ||
              criticalRules.some(r => r.includes(name));
            if (hasAboveFold) {
              criticalRules.push(rule.cssText);
            }
          }
        }
      } catch (e) {
        // CORS stylesheet, skip
      }
    }

    return criticalRules;
  });

  await page.close();
  return critical.join('\n');
}

extractCritical().catch(console.error);
