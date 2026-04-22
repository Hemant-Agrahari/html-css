#!/usr/bin/env node
/**
 * PurgeCSS Per-Page — Removes unused CSS from vendor files per page.
 *
 * For each page:
 *   1. Combines all vendor CSS + global.css
 *   2. Runs PurgeCSS against that page's built HTML
 *   3. Outputs purged CSS to dist/css/pages/{page-name}.purged.css
 *   4. Updates the HTML to load only the purged CSS instead of 5+ vendor files
 *
 * The safelist includes all dynamically-added classes from JS.
 */

const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

// All vendor + global CSS files to combine and purge (Bootstrap included per css-strategy.md)
const VENDOR_CSS_FILES = [
  'assets/vendor/css/bootstrap.min.css',
  'css/vendor/site-main.css',
  'css/vendor/site-components.css',
  'css/vendor/site-pages.css',
  'css/vendor/site-templates.css',
  'css/vendor/site-service-pages.css',
  'css/global.css',
];

// Comprehensive safelist: classes added by JavaScript at runtime
const SAFELIST = {
  // Exact class names
  standard: [
    // Bootstrap modal
    'show', 'fade', 'modal-open', 'modal-backdrop', 'modal-static',
    'collapse', 'collapsing', 'collapsed',
    // Bootstrap dropdown
    'dropdown-menu', 'dropdown-toggle', 'dropup', 'dropend', 'dropstart',
    // Bootstrap nav/tabs
    'active', 'tab-pane', 'nav-link',
    // Bootstrap accordion
    'accordion-collapse',
    // Navigation JS
    'scrolled', 'header-fixed', 'hidden',
    // AOS
    'aos-animate', 'aos-init',
    // Back to top
    'visible',
    // Custom slider / Testimonial carousel
    'testimonial-slider-fresh', 'testimonial-slide',
    'testi-carousel', 'testi-track', 'testi-slide', 'testi-arrow', 'testi-prev', 'testi-next',
  ],
  // Regex patterns for dynamic class prefixes (keep tight — broad patterns bloat purged output)
  deep: [
    /^slick-/,        // slick-slide, slick-cloned, slick-initialized, etc.
    /^aos-/,          // aos-animate, aos-init
    /^modal/,         // modal, modal-dialog, modal-content, modal-header, modal-body, modal-footer, modal-backdrop
    /^bs-/,           // Bootstrap JS-added classes
    /^fade/,          // fade, fadeIn
    /^dropdown-menu/  // dropdown-menu show state
  ],
  greedy: [
    /data-aos/,       // [data-aos] attribute selectors
    /data-bs/,        // [data-bs-*] attribute selectors
  ],
};

function getPages() {
  return fs.readdirSync(DIST_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const name = f.replace('.html', '');
      return { name, file: f };
    });
}

async function main() {
  const pages = getPages();
  console.log(`\nPurgeCSS Per-Page Optimization`);
  console.log(`Pages: ${pages.length}`);

  // Calculate original combined CSS size
  let originalSize = 0;
  const combinedCSS = [];
  for (const cssFile of VENDOR_CSS_FILES) {
    const fullPath = path.join(DIST_DIR, cssFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      combinedCSS.push(content);
      originalSize += content.length;
    }
  }
  const allCSS = combinedCSS.join('\n');
  console.log(`Original combined CSS: ${(originalSize / 1024).toFixed(0)}KB\n`);

  // Write combined CSS to temp file for PurgeCSS
  const tempCSSPath = path.join(DIST_DIR, '_temp_combined.css');
  fs.writeFileSync(tempCSSPath, allCSS);

  const results = [];

  for (const pg of pages) {
    process.stdout.write(`  ${pg.name}... `);

    const htmlPath = path.join(DIST_DIR, pg.file);

    // Include the page-specific SOURCE CSS (from shared/, not dist/)
    // This ensures new rules in home.css, service.css etc. are included in the purge input
    const SHARED_DIR = path.join(__dirname, '..', 'shared');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    let pageCSS = '';

    // Read ALL source page CSS files that could apply to this page
    // Explicitly read from shared/ source — never from purged/critical outputs
    const pageCSSName = pg.name === 'index' ? 'home' : pg.name;
    const sourceCSSFiles = [
      path.join(SHARED_DIR, 'css', 'pages', pageCSSName + '.css'),
      path.join(SHARED_DIR, 'css', 'pages', 'service.css'),
      path.join(SHARED_DIR, 'css', 'pages', 'legal.css'),
      path.join(SHARED_DIR, 'css', 'pages', 'about.css'),
      path.join(SHARED_DIR, 'css', 'pages', 'contact.css'),
    ];
    for (const f of sourceCSSFiles) {
      if (fs.existsSync(f) && !f.includes('.purged.') && !f.includes('.critical.')) {
        const name = path.basename(f);
        // Only include if it's this page's CSS or it's referenced in the HTML
        if (f === sourceCSSFiles[0] || html.includes(name)) {
          pageCSS += fs.readFileSync(f, 'utf-8') + '\n';
        }
      }
    }

    try {
      const purgeResult = await new PurgeCSS().purge({
        content: [{ raw: html, extension: 'html' }],
        css: [{ raw: allCSS + '\n' + pageCSS }],
        safelist: {
          standard: SAFELIST.standard,
          deep: SAFELIST.deep,
          greedy: SAFELIST.greedy,
        },
        // Keep @font-face, @keyframes, @media rules that reference safelisted selectors
        fontFace: true,
        keyframes: true,
        variables: true,
      });

      if (purgeResult.length > 0) {
        const purgedCSS = purgeResult[0].css;
        const outputPath = path.join(DIST_DIR, 'css', 'pages', `${pg.name}.purged.css`);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, purgedCSS);

        const savedKB = ((allCSS.length + pageCSS.length - purgedCSS.length) / 1024).toFixed(0);
        const purgedKB = (purgedCSS.length / 1024).toFixed(1);
        console.log(`${purgedKB}KB (saved ${savedKB}KB)`);
        results.push({ page: pg.name, size: purgedCSS.length, original: originalSize + pageCSS.length });
      }
    } catch (err) {
      console.log(`ERROR: ${err.message.substring(0, 80)}`);
    }
  }

  // Cleanup temp file
  fs.unlinkSync(tempCSSPath);

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`Original: ${(originalSize / 1024).toFixed(0)}KB per page (combined vendor CSS)`);
  const avgPurged = results.reduce((sum, r) => sum + r.size, 0) / results.length;
  console.log(`Average purged: ${(avgPurged / 1024).toFixed(1)}KB per page`);
  console.log(`Average saving: ${((originalSize - avgPurged) / 1024).toFixed(0)}KB per page (${((1 - avgPurged / originalSize) * 100).toFixed(0)}% reduction)`);
}

main().catch(console.error);
