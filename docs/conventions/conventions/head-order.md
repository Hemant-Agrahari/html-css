# Head Order Convention

The browser parses `<head>` top-down and blocks render on stylesheets it encounters
**before** it sees `<body>`. Order matters: preload hints that come after a blocking
stylesheet are useless for that paint cycle. This doc is the single allowed ordering.

## The canonical order

Every built page must emit `<head>` in exactly this order. Nothing else is permitted.

```
1. <meta charset>                             UTF-8, first byte
2. <meta viewport>                            mobile render

── LCP PRELOAD (earliest possible discovery by preload scanner) ──
3. <link rel="preload" as="image" fetchpriority="high"> LCP image only, if any

── SEO + SOCIAL METADATA ──
4. <title>                                    tab + SEO
5. <meta description, keywords, robots>       SEO
6. <link canonical>                           SEO
7. <meta og:*, twitter:*>                     social
8. <link rel="alternate" hreflang>            i18n (if applicable)
9. <link rel="icon">, <link rel="apple-touch-icon">   favicons

── REMAINING EARLY NETWORK HINTS (before blocking CSS) ──
10. <link rel="preconnect">                   for every third-party origin the page uses
11. <link rel="preload" as="font" ...>        critical fonts only (woff2, crossorigin)

── CRITICAL CSS (inlined — zero blocking stylesheets) ──
12. <style>/* fonts.css + per-page critical CSS */</style>   fonts + above-fold, target <28KB

── DEFERRED CSS (single file per page) ──
13. <link rel="stylesheet" href="...purged.css" media="print" onload="this.media='all'">
14. <noscript><link rel="stylesheet" href="...purged.css"></noscript>

   No other <link rel="stylesheet"> tags exist in <head>. All vendor CSS libraries
   (FA, Slick, AOS, Bootstrap) have been removed or folded into the purge input.

── STRUCTURED DATA (after render-path is set up) ──
15. <script type="application/ld+json">         WebPage → Organization → WebSite → Product → Breadcrumb → FAQ → LocalBusiness

── ANALYTICS (dead last, never blocking) ──
16. <script async|defer src="...">              GTM, GA, etc. — async only, never sync

</head>
```

### Why LCP preload is at step 3 (not 11)

The browser's preload scanner is a secondary HTML parser that runs ahead of the main parser
looking for resource hints. Current web standards (web.dev, MDN, GTmetrix 2026) recommend
preload "as early as possible, after charset and viewport, before anything blocking." Only
`<meta charset>` and `<meta viewport>` must come first — charset is required in the first
1024 bytes by the HTML spec, viewport affects rendering decisions. Everything else (title,
SEO meta, OG, favicons) doesn't block rendering but occupies parser time before the scanner
reaches the LCP preload hint. Moving preload to step 3 minimizes that delay.

Font preload and preconnect are currently emitted by `head-meta.html` after the SEO block
(step 10-11 above). Moving them earlier is recommended but requires code changes; tracked
separately.

## Hard rules

- **R01** — `<head>` emits in the canonical order above.
- **R02** — No `<script>` with `src` but no `async`/`defer` is ever allowed. Always one or the other.
- **R03** — No vendor CSS `<link>` tags in `head-meta.html`. All vendor libraries (FA, Bootstrap, Slick, AOS) have been either removed or folded into the purge input. `head-meta.html` contains only the font preload hint.
- **JSON-LD blocks come *after* all CSS**, not before. (Fixed April 2026 — `buildSchemas()` now separate from `buildHead()` and emitted after CSS.)
- **Zero blocking stylesheets.** Critical CSS is inlined as `<style>`, purged CSS is deferred. No `<link rel="stylesheet">` without `media="print" onload`.
- **Preloads for fonts and LCP image must appear before the `<style>` block** or the preload loses its purpose.
- **Analytics always last.** Never place GTM/GA above CSS even as inline.

## Resolved deviations (April 2026)

All originally-identified deviations have been fixed:

- ~~JSON-LD before font preload~~ → `buildSchemas()` now separate, emitted after CSS
- ~~Bootstrap + FA loaded separately~~ → Bootstrap folded into PurgeCSS, FA removed entirely
- ~~LCP preload only on home~~ → per-page via `lcp_image:` frontmatter
- ~~Critical CSS not wired~~ → inlined per page via `extract-critical-css-page.js`
- ~~4 separate deferred vendor CSS links~~ → all vendor CSS removed (FA, Slick, AOS)
- ~~`fonts.css` as blocking link~~ → inlined with critical CSS
- ~~Noscript loads 4 sheets~~ → only noscript fallback for the single purged CSS

No current deviations from the canonical head order.

## Verifying a page

On any built page in `dist/`:

```bash
# Show <head> only
awk '/<head/,/<\/head>/' dist/white-label-igaming-platform.html
```

Walk it top-to-bottom against the canonical order above. The first violation is the fix.
