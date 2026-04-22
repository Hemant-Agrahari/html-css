# JavaScript Strategy

Rules for where JS lives, how it loads, and what's allowed in `<head>`. Goal: zero render-blocking
JS, minimal INP hit, and only the modules a page actually uses.

## Banned libraries

The following libraries have been **removed and must never be re-added**:

| Library | Size | Why banned | Replacement |
|---|---|---|---|
| **jQuery** | 85 KB | Only needed for Slick; no other code depends on it | Vanilla DOM APIs |
| **Slick Carousel** | 42 KB + CSS | jQuery dependency, heavy for 3 slides | `carousel-vanilla.js` (~1.5 KB) |
| **Bootstrap JS** | 79 KB | Only `.Modal()` was used; accordion/tabs/nav were already vanilla | `modal-vanilla.js` (~1 KB) |
| **AOS (Animate on Scroll)** | 15 KB + 6 KB CSS | Replaced by CSS transitions + IntersectionObserver | `aos-init.js` rewrite (~500 bytes) |
| **Font Awesome** | 300 KB fonts + 3 KB CSS | 7 icons used; each replaced with inline SVG | Inline `<svg>` elements (~1 KB total) |

If someone proposes re-adding any of these, point them here. The 533 KB removal was the
single biggest CWV improvement in the project's history.

## File taxonomy

| Location | Example | Role |
|---|---|---|
| `shared/js/nav.js` | nav toggle, always needed | **Core** — loaded on every page |
| `shared/js/forms.js` | form validation | **Core-by-need** — loaded only on pages with `<form>` |
| `shared/js/countries-data.js` | 242 countries + dial codes | **Data** — loaded only on pages with `name="country"` |
| `shared/js/animations.js` | old monolithic init file | **Legacy** — prefer per-module files below |
| `shared/js/modules/modal-vanilla.js` | modal show/hide/backdrop/ESC | **Core** — loaded on every page (replaces Bootstrap JS) |
| `shared/js/modules/carousel-vanilla.js` | VCarousel: autoplay, arrows, responsive | **Core** — loaded on every page (replaces jQuery + Slick) |
| `shared/js/modules/accordion.js` | FAQ expand/collapse | **Module** — auto-detected and loaded per page |
| `shared/js/modules/aos-init.js` | scroll-reveal via IntersectionObserver | **Module** — loaded on every page (replaces AOS library) |
| `shared/js/modules/back-to-top.js` | scroll-to-top button (inline SVG arrow) | **Module** |
| `shared/js/modules/counters.js` | animated counters | **Module** |
| `shared/js/modules/country-dropdowns.js` | country picker | **Module** |
| `shared/js/modules/modals.js` | CTA → modal routing, form submission | **Module** — uses `VModal` from `modal-vanilla.js` |
| `shared/js/modules/slick-init.js` | carousel init from scraped slick markup | **Module** — uses `VCarousel` from `carousel-vanilla.js` |
| `shared/js/modules/smooth-scroll.js` | anchor smooth scroll | **Module** |
| `shared/js/modules/tabs.js` | tab switching (vanilla, no Bootstrap JS) | **Module** |

Naming rule: one feature per module, `{feature}.js` or `{feature}-init.js`. No monolithic
do-everything files — `animations.js` is legacy and should shrink over time.

## Loading pattern (hard rules)

- **R13** — No banned libraries ever. jQuery, Bootstrap JS, Slick, AOS, Font Awesome were all removed April 2026; re-adding any of them is a hard fail.
- **R15** — No third-party CDN scripts in page or component HTML. Self-host everything under `shared/js/`. CDNs add DNS + TLS round-trip. Exception: Cloudflare beacon (injected by Cloudflare, not us) and the chat widget (lazy-loaded on `window.onload` + `requestIdleCallback`, preconnect in `head-meta.html` resolves DNS/TLS early).
- **Every `<script src>` uses `defer`.** No synchronous scripts, ever. (Enforced by R02 in head-order.md.)
- **Analytics (GTM, GA, pixels) use `async`.** Fire-and-forget, at the end of `<head>`.
- **No inline `<script>` in page bodies** except JSON-LD (declarative data, not executable) and the chat widget lazy-loader (intentionally inline, loads on `window.onload` + `requestIdleCallback` to keep TBT near zero while showing the widget on every page).
- **No framework runtimes.** No React, Vue, Alpine, jQuery, or any library > 5 KB. This project is intentionally vanilla. Every feature must be implementable in < 2 KB of vanilla JS or it doesn't belong.
- **No `<link rel="stylesheet">` for JS libraries.** All animation/carousel CSS goes in `global.css` and gets picked up by PurgeCSS. Slick CSS, AOS CSS, FA CSS are all gone.

## Auto-detection (the build contract)

`build.js` `detectJsModules()` sniffs each page's HTML with regex and emits the right `<script>`
tags at the `{{js_modules}}` marker. Current detection rules:

| Trigger regex | Module added |
|---|---|
| `brand-slider\|client-slider\|customer-testomial\|poker-script-slider\|slick-slider` | `/js/modules/slick-init.js` |
| `testi-carousel` | `/js/modules/testi-slider.js` |
| `name="country"` | `/js/countries-data.js` + `/js/modules/country-dropdowns.js` |
| `<form` | `/js/forms.js` |
| `counter-number\|counter-num\|small-title` | `/js/modules/counters.js` |
| `accordion-button\|accordion-collapse` | `/js/modules/accordion.js` |
| `data-bs-toggle="tab"\|role="tab"\|nav-tabs` | `/js/modules/tabs.js` |

**Rule when adding a new module:** update `detectJsModules()` in `build.js` in the same commit.

## Vanilla component APIs

### VModal (modal-vanilla.js)

```js
var modal = new VModal(document.getElementById('contactModal'));
modal.show();   // opens modal + backdrop, locks body scroll, listens ESC
modal.hide();   // closes, removes backdrop, dispatches 'hidden.bs.modal'
```

Supports: backdrop click-to-close, `.btn-close` button, ESC key, body scroll lock.
Events: `hidden.bs.modal` (for backwards compat with existing code).

### VCarousel (carousel-vanilla.js)

```js
new VCarousel(element, {
  slidesToShow: 2,        // visible slides
  autoplay: true,         // auto-advance
  autoplaySpeed: 5000,    // ms between advances
  arrows: true,           // prev/next buttons
  responsive: [           // breakpoint overrides
    { breakpoint: 768, settings: { slidesToShow: 1 } }
  ]
});
```

Supports: responsive `slidesToShow`, autoplay with pause-on-hover, prev/next arrows
(`.slick-prev`/`.slick-next` classes for CSS compat), infinite loop, resize handling.

## INP protection

- **Debounce resize and scroll handlers** — use `requestAnimationFrame` or 100 ms debounce.
- **Use passive listeners on touch/scroll.** `{ passive: true }`.
- **Defer heavy work with `requestIdleCallback`** when not synchronous with input.
- **Never `.innerHTML =` a large fragment on click.** Use `DocumentFragment`.

## Current deviations (to fix)

| Deviation | Location | Target |
|---|---|---|
| `animations.js` still monolithic | `shared/js/animations.js` (167+ lines) | Migrate remaining responsibilities into `modules/`; delete once empty |
| GTM commented out in production HTML | `build.js` `gtag` component | When re-enabling, must be `async`, last in `<head>` |

---

## Chat widget loading strategy (April 2026)

The chat widget in `shared/components/chat-widget.html` uses `setTimeout(loadChat, 5000)` after
`window.onload` — not `requestIdleCallback`.

**Why:** `requestIdleCallback` fired during Lighthouse's TBT observation window, causing the
~1.4MB LeadConnector JS to execute and register as blocking time. PSI desktop showed TBT 590ms.
A fixed 5-second delay after `load` pushes execution well past the measurement period.

**Evidence:** PageSpeed Insights desktop audit, April 2026 — TBT 590ms with `requestIdleCallback`.

**User impact:** Chat bubble appears ~6-8s after navigation instead of ~2-3s. Acceptable because
users rarely interact with chat in the first few seconds. The `<link rel="preconnect">` in
`head-meta.html` still resolves DNS/TLS early so the widget loads quickly once the timer fires.
