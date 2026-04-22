# Module: Frontend — HTML & CSS

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Semantic HTML page structure
- CSS architecture (BEM, utility-first, or CSS Modules)
- Tailwind CSS styling
- Responsive design (mobile-first, container queries)
- Accessibility (ARIA landmarks, roles, labels)
- Static or server-rendered pages (non-React)

---

## Standards & Conventions

### Semantic HTML

Use the correct HTML element for its purpose:

| Purpose | Element | NOT |
|---|---|---|
| Page sections | `<header>`, `<main>`, `<footer>`, `<nav>`, `<aside>` | `<div class="header">` |
| Headings | `<h1>`–`<h6>` in order (no skipping levels) | `<div class="title">` |
| Lists | `<ul>`, `<ol>`, `<dl>` | `<div>` with line breaks |
| Buttons | `<button>` | `<div onclick>`, `<a href="#">` |
| Links | `<a href="...">` | `<button>` for navigation |
| Forms | `<form>`, `<fieldset>`, `<legend>`, `<label>` | Unlabeled inputs |
| Tables | `<table>`, `<thead>`, `<tbody>`, `<th scope>` | Grid of divs |
| Images | `<img alt="...">` or `<figure>` + `<figcaption>` | Background images for content |

### ARIA Landmarks

Every page MUST have:
- Exactly one `<main>` element
- A `<nav aria-label="...">` for each navigation region
- `<header>` and `<footer>` at page level
- `aria-label` or `aria-labelledby` on repeated landmark types

### CSS Architecture

**Option A — BEM (Block Element Modifier):**
```css
.card {}
.card__header {}
.card__body {}
.card--featured {}
```

**Option B — Utility-first (Tailwind v4):**
- Use Tailwind classes directly in HTML
- Extract components only when a pattern repeats 3+ times
- Use `@apply` sparingly — prefer component extraction

**Option C — CSS Modules:**
- One `.module.css` per component
- Compose shared styles via `composes:`

Choose the approach matching FRD §12.1 tech stack. If not specified, default to the project's existing pattern.

### Responsive Design

**Mobile-first approach:**
```css
/* Base: mobile (< 640px) */
.component { flex-direction: column; }

/* Tablet: >= 640px */
@media (min-width: 640px) { .component { flex-direction: row; } }

/* Desktop: >= 1024px */
@media (min-width: 1024px) { .component { max-width: 1200px; } }
```

**Standard breakpoints (align with FRD §12.1 if specified):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Container queries** (when component responsiveness matters more than viewport):
```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { flex-direction: row; }
}
```

---

## Implementation Checklist

- [ ] HTML validates (no duplicate IDs, no missing closing tags)
- [ ] All images have `alt` attributes (empty `alt=""` for decorative images)
- [ ] All form inputs have associated `<label>` elements
- [ ] Page has proper landmark structure (`header`, `nav`, `main`, `footer`)
- [ ] Heading hierarchy is sequential (h1 → h2 → h3, no skips)
- [ ] Interactive elements are keyboard-accessible (tab order, Enter/Space activation)
- [ ] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- [ ] Layout is responsive at all defined breakpoints
- [ ] No horizontal scroll at any breakpoint
- [ ] Skip-to-main-content link present (if page has navigation)
- [ ] `lang` attribute set on `<html>` element

---

## Code Patterns

### Page Structure

```html
<!-- Implements: TASK-### (FR-###) [SCR-###] -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title] — [App Name]</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>

  <header>
    <nav aria-label="Main navigation">
      <!-- nav items -->
    </nav>
  </header>

  <main id="main">
    <h1>[Page Heading]</h1>
    <!-- page content -->
  </main>

  <footer>
    <!-- footer content -->
  </footer>
</body>
</html>
```

### Form Pattern

```html
<form action="/submit" method="POST">
  <fieldset>
    <legend>Contact Information</legend>

    <div class="form-group">
      <label for="email">Email address</label>
      <input type="email" id="email" name="email" required
             aria-describedby="email-help">
      <small id="email-help">We'll never share your email.</small>
    </div>

    <div class="form-group">
      <label for="message">Message</label>
      <textarea id="message" name="message" required
                minlength="10" maxlength="500"></textarea>
    </div>

    <button type="submit">Send</button>
  </fieldset>
</form>
```

### Tailwind v4 Component

```html
<!-- Implements: TASK-### (FR-###) [SCR-###] -->
<div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
  <img src="avatar.jpg" alt="User avatar"
       class="size-12 rounded-full object-cover">
  <div class="flex-1">
    <h2 class="text-lg font-semibold text-gray-900">Username</h2>
    <p class="text-sm text-gray-600">Role description</p>
  </div>
  <button class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                 hover:bg-blue-700 focus:outline-2 focus:outline-offset-2
                 focus:outline-blue-600">
    Action
  </button>
</div>
```

---

## Quality Gates

1. **HTML validation** — no errors from W3C validator rules
2. **Accessibility audit** — axe-core or Lighthouse accessibility score >= 90
3. **Responsive check** — visually verify at mobile (375px), tablet (768px), desktop (1280px)
4. **Keyboard navigation** — all interactive elements reachable and operable via keyboard
5. **Performance** — no render-blocking resources, images have width/height or aspect-ratio

---

## Common Pitfalls

- **Div soup** — wrapping everything in `<div>` instead of semantic elements. Use `<section>`, `<article>`, `<aside>`.
- **Missing form labels** — every `<input>` needs a `<label>`. Placeholder is NOT a label.
- **Fixed widths on containers** — use `max-width` + `width: 100%`, not `width: 800px`.
- **Z-index wars** — define a z-index scale (10, 20, 30, 40, 50) and document it.
- **!important abuse** — if you need `!important`, the specificity architecture is wrong.
- **Viewport units for text** — `font-size: 3vw` becomes unreadable on mobile. Use `clamp()`.
- **Missing focus styles** — removing outlines without a custom focus indicator.
