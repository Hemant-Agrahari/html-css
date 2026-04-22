# OHShtml Coding Conventions

Single source of truth for how pages, CSS, JS, and images are loaded in this project.
Every rule here exists to protect Core Web Vitals (LCP, CLS, INP) and the render path.

Enforcement is **manual for now** — conventions will be validated on 2–3 pages before any
build hook, pre-commit check, or CI gate is added. See `../cwv-definition-of-done.md` for the
per-page checklist an agent or human must tick before marking a page done.

## Documents

| File | Scope |
|---|---|
| [`head-order.md`](head-order.md) | Exact ordering of `<head>` — preloads, CSS, schema, analytics |
| [`css-strategy.md`](css-strategy.md) | Which CSS lives where, how it loads, naming (`*.critical.css`, `*.purged.css`), Bootstrap purging |
| [`js-strategy.md`](js-strategy.md) | `defer` / `async` rules, inline vs external, auto-detection via `build.js` |
| [`image-strategy.md`](image-strategy.md) | `fetchpriority`, `loading`, `decoding`, intrinsic dimensions, format choice |

## Supporting docs

- [`../cwv-definition-of-done.md`](../cwv-definition-of-done.md) — per-page DoD gate
- `.claude/skills/cwv-build-conventions/SKILL.md` — project-binding skill that wires the generic CWV/performance skills to these conventions

## When conventions and reality disagree

Conventions describe the **target** state. If `build.js`, a component, or a page output
violates a convention, fix the output — don't update the convention to match the bug.
Convention changes require either a deliberate decision or evidence (Lighthouse, real-user metrics)
that the current rule is wrong. Log the reason in the doc's change history.
