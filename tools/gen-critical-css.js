#!/usr/bin/env node
/**
 * Generates inline critical CSS for the home page above-fold content.
 * Extracts only the styles needed for: body, header, hero banner, trusted-by marquee.
 * Injected as <style> in <head> to allow async loading of full CSS.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

// Key above-fold selectors for the home page
const CRITICAL_SELECTORS = [
  // Body/base
  'body', '.__className_ed3508', '.container',
  // Header
  'header', '.sticky', '.scrolled', '.nav-header', '.main_menu',
  '.header-logo', '.logo', '.mobile_btn',
  // Hero banner
  '.main-banner', '.inner-contnent', '.btn-wrap', '.btn-custom',
  // Trusted by marquee
  '.trusted-by-section', '.top-80', '.marquee', '.slider-img-logo', '.sm-title',
  // Layout
  '.row', '.col-lg-7', '.col-md-', '.col-lg-', '.d-flex', '.align-items',
  '.text-white', '.overflow-hidden', '.img-fluid',
];

function extractCriticalRules(cssText) {
  const rules = [];
  // Simple CSS rule extractor - handles nested @media too
  let i = 0;
  while (i < cssText.length) {
    // Skip whitespace
    while (i < cssText.length && /\s/.test(cssText[i])) i++;
    if (i >= cssText.length) break;

    // @media block
    if (cssText[i] === '@' && cssText.substring(i, i + 6) === '@media') {
      const mediaStart = i;
      // Find the opening brace
      const braceIdx = cssText.indexOf('{', i);
      if (braceIdx === -1) break;
      const mediaQuery = cssText.substring(i, braceIdx).trim();

      // Find matching closing brace
      let depth = 1;
      let j = braceIdx + 1;
      while (j < cssText.length && depth > 0) {
        if (cssText[j] === '{') depth++;
        if (cssText[j] === '}') depth--;
        j++;
      }
      const mediaBlock = cssText.substring(braceIdx + 1, j - 1);

      // Extract critical rules within media block
      const criticalInMedia = extractCriticalFromFlat(mediaBlock);
      if (criticalInMedia.length > 0) {
        rules.push(mediaQuery + '{' + criticalInMedia.join('') + '}');
      }
      i = j;
    } else if (cssText[i] === '@') {
      // Skip other @ rules (keyframes, etc) — find closing brace
      let depth = 0;
      let j = i;
      while (j < cssText.length) {
        if (cssText[j] === '{') depth++;
        if (cssText[j] === '}') { depth--; if (depth <= 0) { j++; break; } }
        j++;
      }

      // Include @keyframes for marquee
      const atRule = cssText.substring(i, j);
      if (atRule.includes('marquee')) {
        rules.push(atRule);
      }
      i = j;
    } else {
      // Regular rule
      const braceIdx = cssText.indexOf('{', i);
      if (braceIdx === -1) break;
      const selector = cssText.substring(i, braceIdx).trim();

      let depth = 1;
      let j = braceIdx + 1;
      while (j < cssText.length && depth > 0) {
        if (cssText[j] === '{') depth++;
        if (cssText[j] === '}') depth--;
        j++;
      }

      if (isCriticalSelector(selector)) {
        rules.push(cssText.substring(i, j));
      }
      i = j;
    }
  }
  return rules;
}

function extractCriticalFromFlat(cssText) {
  const rules = [];
  let i = 0;
  while (i < cssText.length) {
    while (i < cssText.length && /\s/.test(cssText[i])) i++;
    if (i >= cssText.length) break;

    const braceIdx = cssText.indexOf('{', i);
    if (braceIdx === -1) break;
    const selector = cssText.substring(i, braceIdx).trim();

    let depth = 1;
    let j = braceIdx + 1;
    while (j < cssText.length && depth > 0) {
      if (cssText[j] === '{') depth++;
      if (cssText[j] === '}') depth--;
      j++;
    }

    if (isCriticalSelector(selector)) {
      rules.push(cssText.substring(i, j));
    }
    i = j;
  }
  return rules;
}

function isCriticalSelector(selector) {
  return CRITICAL_SELECTORS.some(s => selector.includes(s));
}

function main() {
  // Read all render-blocking CSS files for home page
  const cssFiles = [
    'css/vendor/site-main.css',
    'css/vendor/site-components.css',
    'css/vendor/site-templates.css',
    'css/global.css',
    'css/pages/home.css',
  ];

  let allCritical = [];
  for (const file of cssFiles) {
    const css = fs.readFileSync(path.join(DIST, file), 'utf-8');
    allCritical.push(...extractCriticalRules(css));
  }

  const criticalCss = allCritical.join('\n');
  console.log(`Critical CSS: ${(criticalCss.length / 1024).toFixed(1)}KB from ${allCritical.length} rules`);

  // Write critical CSS file
  fs.writeFileSync(path.join(DIST, 'css', 'critical-home.css'), criticalCss);
  console.log('Written: dist/css/critical-home.css');
}

main();
