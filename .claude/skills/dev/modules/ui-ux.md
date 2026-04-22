# Module: UI/UX Design Implementation

## When This Module Applies

Use this module when implementing TASK-### entries involving:
- Design tokens (colors, typography, spacing, shadows)
- Component visual design and styling
- Layout systems and grid definitions
- WCAG accessibility compliance
- Design system foundations

---

## Standards & Conventions

### Design Token Architecture

Organize tokens in three tiers:
1. **Global tokens** — raw values (colors, font sizes, spacing units)
2. **Semantic tokens** — purpose-mapped (--color-primary, --color-error, --spacing-md)
3. **Component tokens** — scoped to a component (--button-bg, --card-padding)

### 8pt Grid System

All spacing and sizing values MUST be multiples of 8px:
- `4px` — only for minor optical adjustments (borders, small gaps)
- `8px` — minimum spacing unit
- `16px` — standard padding/gap
- `24px` — section spacing
- `32px` — large spacing
- `48px` — section dividers
- `64px` — page-level spacing

### Typography Scale

Use a consistent type scale (e.g., Major Third — 1.250 ratio):
```
--font-size-xs:   0.75rem   /* 12px */
--font-size-sm:   0.875rem  /* 14px */
--font-size-base: 1rem      /* 16px */
--font-size-md:   1.125rem  /* 18px */
--font-size-lg:   1.25rem   /* 20px */
--font-size-xl:   1.5rem    /* 24px */
--font-size-2xl:  1.875rem  /* 30px */
--font-size-3xl:  2.25rem   /* 36px */
```

Line heights: `1.2` for headings, `1.5` for body text, `1.75` for small/caption text.

### Color System

Define a minimum palette:
- **Primary** — brand color + 5 tints/shades (50, 100, 200, ..., 900)
- **Neutral** — gray scale for text, borders, backgrounds
- **Semantic** — success (green), warning (amber), error (red), info (blue)
- **Surface** — background layers (--surface-0 through --surface-3)

All color pairs MUST meet WCAG AA contrast ratios:
- Normal text (< 18px): **4.5:1** minimum
- Large text (>= 18px or >= 14px bold): **3:1** minimum
- UI components and graphical objects: **3:1** minimum

### Touch Targets

- Minimum interactive target size: **44x44px** (WCAG 2.5.5)
- Minimum spacing between targets: **8px**
- For dense UIs (data tables), minimum: **32x32px** with adequate spacing

---

## Implementation Checklist

Before marking a UI/UX task complete:

- [ ] Design tokens defined as CSS custom properties or theme config
- [ ] All spacing values on 8pt grid
- [ ] Typography scale applied consistently
- [ ] Color contrast ratios meet WCAG AA (verify with tool or manual check)
- [ ] Touch targets meet minimum size requirements
- [ ] Focus states visible for all interactive elements
- [ ] Dark mode support if required by FRD
- [ ] Responsive breakpoints defined (see FRD §12.1 for target devices)

---

## Code Patterns

### CSS Custom Properties (Vanilla CSS / any framework)

```css
/* Implements: TASK-### (FR-###) [SCR-###] */

:root {
  /* Global tokens */
  --blue-500: #3b82f6;
  --gray-100: #f3f4f6;
  --gray-900: #111827;
  --radius-md: 8px;

  /* Semantic tokens */
  --color-primary: var(--blue-500);
  --color-text: var(--gray-900);
  --color-bg: var(--gray-100);
  --spacing-unit: 8px;
  --spacing-sm: calc(var(--spacing-unit) * 1);   /* 8px */
  --spacing-md: calc(var(--spacing-unit) * 2);   /* 16px */
  --spacing-lg: calc(var(--spacing-unit) * 3);   /* 24px */
  --spacing-xl: calc(var(--spacing-unit) * 4);   /* 32px */
}
```

### Tailwind Config (when FRD §12.1 specifies Tailwind)

```js
// Implements: TASK-### (FR-###) [SCR-###]

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    spacing: {
      0: '0px',
      1: '4px',   // optical adjustment only
      2: '8px',
      3: '16px',
      4: '24px',
      5: '32px',
      6: '48px',
      7: '64px',
    },
    extend: {
      colors: {
        primary: { /* tints/shades from FRD branding */ },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
      },
    },
  },
};
```

### Component Naming Convention

- Prefix component files: `{ComponentName}.{ext}` (PascalCase)
- CSS class naming: BEM (`.block__element--modifier`) or utility-first (Tailwind)
- Token variables: `--{scope}-{property}-{variant}` (e.g., `--button-bg-hover`)

---

## Quality Gates

1. **Contrast check** — every text/background pair meets 4.5:1 (or 3:1 for large text)
2. **Grid alignment** — inspect all spacing values; none should be off-grid (5px, 10px, 15px are violations)
3. **Focus visibility** — tab through all interactive elements; focus ring must be visible
4. **Responsive** — layout doesn't break at defined breakpoints
5. **Token usage** — no hardcoded color/spacing values; all use tokens/variables

---

## Common Pitfalls

- **Hardcoded values** — using `padding: 12px` instead of a token. Always use the spacing scale.
- **Missing focus states** — removing `outline` without a replacement. Every focusable element needs a visible indicator.
- **Color-only indicators** — using only color to convey meaning (error = red text). Add icons or text labels.
- **Inconsistent radius** — mixing `4px`, `6px`, `8px` border-radius across components. Pick 2-3 values and stick to them.
- **Forgetting dark mode** — if FRD requires it, every semantic color needs a dark variant.
- **Viewport units for text** — don't use `vw` for font-size without `clamp()`. Text must remain readable at all sizes.
