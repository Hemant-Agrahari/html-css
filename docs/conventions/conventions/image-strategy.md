# Image Strategy

Images are almost always the LCP element on service pages and the biggest CLS risk.
Rules below are tight because image handling is the highest-leverage CWV lever we have.

## Required attributes on every `<img>`

```html
<img
  src="/assets/product_images/foo.webp"
  alt="descriptive, specific, non-keyword-stuffed"
  width="600"
  height="400"
  loading="lazy"     | "eager"      <!-- exactly one, see below -->
  decoding="async"
  fetchpriority="low" | "high"      <!-- optional; required on LCP -->
>
```

- **R08** — `width`, `height`, `alt`, `decoding="async"` are mandatory on every `<img>`. Intrinsic dimensions reserve space before the image arrives, preventing CLS — missing them is the #1 cause of layout shift on this site. `alt` may be empty (`alt=""`) for purely decorative images; never write "image of X" — describe what's shown. `decoding="async"` lets the browser decode off the main thread.

## `loading` attribute: eager vs lazy

| Image role | `loading` | `fetchpriority` |
|---|---|---|
| LCP image (hero, banner, primary product shot above fold) | `eager` | `high` |
| Logo in header | `eager` | `low` (tiny, already fast) |
| Phone/flag icons in header (visible on load) | `eager` | `low` |
| Anything else above the fold (stats row, trust badges) | `eager` | `low` |
| Everything below the fold | `lazy` | `low` (default) |
| Images inside modals or offscreen carousels | `lazy` | `low` |

**Rule of thumb:** `loading="eager"` is the default on above-the-fold, `lazy` below. `fetchpriority="high"`
is reserved for the single LCP candidate — never more than one per page. Multiple high-priority
preloads cancel each other out and hurt LCP.

- **R11** — At most one `<link preload fetchpriority=high>` without a `media` query per built page. Multiple "always fires" preloads compete on every viewport. Disjoint media queries (one mobile, one desktop) are fine.

## LCP preload

Pages where the LCP element is an `<img>` declare it in frontmatter:

```yaml
lcp_image: /assets/product_images/sportsbook-iframe-solutions-bg.webp
```

`build.js` reads that and emits in `<head>`:

```html
<link rel="preload" as="image" fetchpriority="high" href="/assets/product_images/sportsbook-iframe-solutions-bg.webp">
```

The matching `<img>` in the body must also have `fetchpriority="high"` and `loading="eager"` so
the browser and the preload agree on priority. A preloaded image that the page doesn't reference
is a wasted request.

**Important finding (April 2026):** On mobile, most pages in this project have **text as LCP**
(the hero H1 + description), not an image. The CSS-background banners don't count as LCP images
because the browser's preload scanner can't discover them. Only pages where a large `<img>` is
above the fold and visually dominant need `lcp_image`. Don't add it to every page — verify with
`PerformanceObserver` on `largest-contentful-paint` first. The font preload is more important
for text-LCP pages.

## Format + responsive

- **WebP is the default.** PNG/JPG only for legacy/transparency edge cases.
- **SVG for icons, logos, and any flat art.** Tiny, resolution-independent.
- **Responsive variants via `srcset` are auto-generated** by `tools/generate-image-variants.js`
  and auto-injected into every `<img>` at build time. See "Auto-srcset" below.

### Auto-srcset (April 2026)

Any source image ≥ 768 px wide gets these variants generated alongside it:

| Variant | Width | Use case |
|---|---|---|
| `{name}-360.webp` | 360w | Mobile portrait |
| `{name}-768.webp` | 768w | Mobile landscape, tablets portrait |
| `{name}-1280.webp` | 1280w | Tablet landscape, small laptops |
| `{name}-1920.webp` | 1920w | Desktop, retina (only generated if source ≥ 1920) |

`tools/image-variants.json` is the manifest. `build.js` reads it and rewrites every
`<img src="X.webp">` into `<img src="X.webp" srcset="X-360.webp 360w, X-768.webp 768w, ...">` automatically.

The `sizes` attribute is set based on column class (Bootstrap):
- Inside `.col-lg-3` → `(min-width: 992px) 25vw, (min-width: 768px) 50vw, 100vw`
- Inside `.col-lg-4` → `(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw`
- Inside `.col-lg-6` → `(min-width: 992px) 50vw, 100vw`
- Default → `100vw`

If the `<img>` already has a `sizes` attribute (e.g. `sizes="100vw"` on a banner), it's preserved.

### Adding a new image

1. Drop the source WebP in `shared/assets/product_images/` (or `shared/assets/images/`)
2. Run `node tools/generate-image-variants.js` (idempotent — only generates new variants)
3. Run `node build.js` — `<img>` tags pick up `srcset` automatically

The variants and the manifest get committed to git.

### LCP preloads

Three frontmatter fields cover the LCP cases:

```yaml
lcp_image:       /assets/product_images/X.webp           # <img> element LCP (with srcset variants)
lcp_bg_mobile:   /assets/images/.../mobile-banner.webp   # CSS background-image LCP for mobile
lcp_bg_desktop:  /assets/images/.../desktop-banner.webp  # CSS background-image LCP for desktop
```

`build.js` emits the right `<link rel="preload">` tag for each:

```html
<!-- lcp_image — responsive preload via imagesrcset -->
<link rel="preload" as="image" fetchpriority="high"
      href="/assets/product_images/X.webp"
      imagesrcset="...-360.webp 360w, ...-768.webp 768w, ...-1280.webp 1280w"
      imagesizes="100vw">

<!-- lcp_bg_mobile — only fires on mobile viewports -->
<link rel="preload" as="image" fetchpriority="high"
      href="/assets/.../mobile-banner.webp"
      media="(max-width: 767px)">

<!-- lcp_bg_desktop — only fires on desktop -->
<link rel="preload" as="image" fetchpriority="high"
      href="/assets/.../desktop-banner.webp"
      media="(min-width: 768px)">
```

CSS `background-image:` URLs are not discoverable by the browser's preload scanner, so
they MUST be preloaded via `lcp_bg_mobile` or `lcp_bg_desktop` if they're the LCP element.

## CSS background-image rules

- **R09** — Never reference `.png` or `.jpg` in a `background-image:` declaration. Use WebP only.
- **R12** — No cross-origin URLs in `background-image:` declarations. Self-host everything.
- **If a CSS background is the LCP on any viewport, declare it in frontmatter** so it's preloaded.
- **Convert legacy PNG/JPG backgrounds to WebP** with `node tools/convert-bg-to-webp.js`. The tool
  generates WebP variants and reports per-file savings; it skips files where WebP is larger.
- **Then run `node tools/rewrite-bg-css.js`** to update CSS source files to use the WebP URLs.
  Re-run PurgeCSS + critical CSS extraction after.
- **Use `image-set()` for responsive backgrounds** when CSS targets multiple resolutions.

## File size budgets

| Image role | Max (compressed) |
|---|---|
| LCP hero (WebP) | 80 KB |
| Section/card image (WebP) | 40 KB |
| Icon (SVG) | 4 KB |
| Logo (SVG) | 10 KB |
| Thumbnail (WebP) | 15 KB |

Exceeding a budget is allowed only if the image is above the fold and visual quality genuinely
justifies it. Below-fold oversize is never justified — it's bandwidth waste.

## Fake SVG trap

Some source assets look like `.svg` files but are actually SVG wrappers around a base64-encoded PNG:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <image href="data:image/png;base64,/9j/4AAQ..." width="4000" height="4000"/>
</svg>
```

These files are 1–19 MB each (the base64 PNG payload) while displaying at 120×120 px on the page.
They caused **NO_LCP** on the home page because the browser cannot use them as an LCP candidate
and cannot preload, compress, or serve them efficiently via CDN.

**Detection:**

```bash
grep -rl "data:image/png;base64" assets/
```

**Fix:** extract the PNG from the base64 payload (Node `Buffer.from(b64, 'base64')`), convert to
WebP via `tools/optimize-images.js`, update `<img src>` references, delete the fake SVG.

**R10** — Never commit SVG files > 50 KB. If an SVG exceeds that, it almost certainly wraps raster data. Audit and convert before deploying. Use `node tools/unwrap-fake-svgs.js` to detect + convert + delete + rewrite refs.

## WebP regression rule

Converting images to WebP does not always reduce file size. Complex photographic backgrounds —
gradients over photos, textured overlays, or images with many distinct colours — can produce
WebP files 2–3× larger than the original PNG:

| Scenario | PNG | WebP | Action |
|---|---|---|---|
| Simple logo / flat art | 40 KB | 12 KB | Convert |
| Complex photo background | 380 KB | 920 KB | Keep PNG |

**Rule:** `tools/convert-bg-to-webp.js` already measures before/after and skips files where WebP
is larger. Always use this tool instead of a bulk converter. Never overwrite the original without
verifying the size comparison first.

After conversion, verify image quality in a browser at the rendered size. WebP can introduce
visible banding on fine gradients that file-size comparisons won't catch.

### Known intentional PNG files

These files have no WebP equivalent because WebP is larger for their content:

| File | Why PNG is kept |
|---|---|
| `it-revolution-bg.png` | WebP version is 2.3× larger (complex photographic gradient) |

Add to this list whenever `convert-bg-to-webp.js` skips a file. The list is the authoritative
record of "this PNG was checked — WebP is not better".

## shared/components blindspot

Automated tools (`rewrite-bg-css.js`, `add-lazy-loading.js`, `generate-image-variants.js`) scan
`shared/css/` and `pages/` but do not recurse into `shared/components/`. Images referenced
directly in component HTML (`grow-modal.html`, `header.html`, `chat-button.html`, etc.) are
invisible to these passes.

**Rule:** after any image format change (PNG → WebP, adding `loading="lazy"`, etc.), manually
grep the components directory for the affected patterns:

```bash
grep -r "\.png\|\.jpg" shared/components/
grep -r 'loading="eager"' shared/components/
```

Fix any found references by hand. Component files are small — a manual check takes under a minute.

---

## Current deviations (to fix)

| Deviation | Location | Target |
|---|---|---|
| LCP preload only on home page | `build.js:341-346` | Read `meta.lcp_image` from page frontmatter and emit preload for every page that defines one |
| No `width`/`height` on many product images | various `content.html` | Audit + backfill via `tools/add-lazy-loading.js` or a new pass |
| `loading="eager"` everywhere on product pages | scraped markup preserved verbatim | Flip below-fold images to `loading="lazy"` (probably already partially done by `add-lazy-loading.js`) |
| No `<picture>` + AVIF anywhere | — | Consider after CWV goal met; AVIF saves ~20% over WebP but requires a second encode pass |
| `decoding="async"` missing on many images | scraped markup | Append via an image-audit pass at build time |
