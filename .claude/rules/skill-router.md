# Skill Routing — Intent-Based Pre-Response Check

BEFORE generating any response, you MUST perform this routing check.
Skipping this check is a protocol violation.

## Step 1: Classify Intent

Map the user's prompt to one of these intents:

| Intent | Example Phrases |
|---|---|
| scrape | "scrape", "capture", "crawl", "download site" |
| analyze | "analyze", "what pages", "site structure", "page inventory" |
| build | "build", "create page", "set up components", "run build" |
| replicate | "new site", "clone", "replicate", "set up another" |
| seo | "SEO", "meta tags", "schema", "sitemap", "title tag", "OG tags" |
| performance | "web vitals", "CWV", "performance", "lighthouse", "LCP", "CLS", "INP" |
| accessibility | "accessibility", "a11y", "WCAG", "ARIA", "screen reader" |
| design | "design", "UI", "UX", "styling", "typography", "layout" |
| assets | "favicon", "icons", "OG image", "web manifest" |
| test | "test", "screenshot", "verify", "playwright", "browser automation" |
| implement | "implement", "code", "develop", "fix", "debug", "refactor" |

## Step 2: Classify Domain (for ambiguous intents)

| Domain | Signals |
|---|---|
| seo-audit | "audit", "check", "report", "validate" + SEO context |
| seo-images | "image", "alt text", "lazy load", "srcset", "WebP" |
| seo-meta | "title tag", "meta description", "OG", "twitter card" |
| seo-structure | "heading", "H1", "JSON-LD", "schema markup", "breadcrumb", "internal links" |
| seo-sitemap | "sitemap", "robots.txt", "XML" |
| seo-fundamentals | "E-E-A-T", "technical SEO", "crawl", "index" |
| seo-ai | "AI search", "AI citations", "GEO", "AI Overviews" |
| cwv | "LCP", "CLS", "INP", "core web vitals" |
| perf | "page speed", "loading", "render blocking", "critical CSS" |
| a11y | "WCAG", "ADA", "Section 508", "keyboard nav", "focus" |
| design-ui | "UI design", "visual", "color", "motion" |
| design-system | "design system", "tokens", "component variants" |
| tailwind | "Tailwind", "utility classes" |
| html-guidelines | "semantic HTML", "forms", "focus states" |

## Step 3: Route → Skill

### Pipeline Skills (planned — not yet created)

| Intent | Skill | Path |
|---|---|---|
| scrape | scrape | `.claude/skills/scrape/SKILL.md` |
| analyze | analyze | `.claude/skills/analyze/SKILL.md` |
| build | build-site | `.claude/skills/build-site/SKILL.md` |
| replicate | replicate | `.claude/skills/replicate/SKILL.md` |

### SEO Skills

| Domain | Skill | Path |
|---|---|---|
| seo-audit | seo-skill | `.claude/skills/seo-skill/SKILL.md` |
| seo-fundamentals | seo-fundamentals | `.claude/skills/seo-fundamentals/SKILL.md` |
| seo-images | seo-images | `.claude/skills/seo-images/SKILL.md` |
| seo-meta | seo-meta-optimizer | `.claude/skills/seo-meta-optimizer/SKILL.md` |
| seo-structure | seo-structure-architect | `.claude/skills/seo-structure-architect/SKILL.md` |
| seo-sitemap | seo-sitemap | `.claude/skills/seo-sitemap/SKILL.md` |
| seo (general/lighthouse) | seo | `.claude/skills/seo/SKILL.md` |
| seo-ai | ai-seo | `.claude/skills/ai-seo/SKILL.md` |

### Performance / CWV Skills

| Domain | Skill | Path |
|---|---|---|
| cwv | core-web-vitals | `.claude/skills/core-web-vitals/SKILL.md` |
| perf | performance | `.claude/skills/performance/SKILL.md` |
| best-practices | best-practices | `.claude/skills/best-practices/SKILL.md` |
| full quality audit | web-quality-audit | `.claude/skills/web-quality-audit/SKILL.md` |

### Accessibility Skills

| Domain | Skill | Path |
|---|---|---|
| a11y (general) | accessibility | `.claude/skills/accessibility/SKILL.md` |
| a11y (WCAG audit) | wcag-audit-patterns | `.claude/skills/wcag-audit-patterns/SKILL.md` |

### Frontend / Design Skills

| Domain | Skill | Path |
|---|---|---|
| design-ui | frontend-design | `.claude/skills/frontend-design/SKILL.md` |
| html-guidelines | web-design-guidelines | `.claude/skills/web-design-guidelines/SKILL.md` |
| assets (favicon/icons/OG) | web-asset-generator | `.claude/skills/web-asset-generator/SKILL.md` |
| design-system / UI/UX | ui-ux-pro-max | `.claude/skills/ui-ux-pro-max/SKILL.md` |
| tailwind | tailwind-patterns | `.claude/skills/tailwind-patterns/SKILL.md` |

### Testing / Automation Skills

| Domain | Skill | Path |
|---|---|---|
| test (webapp/UI verify) | webapp-testing | `.claude/skills/webapp-testing/SKILL.md` |
| test (playwright/e2e) | playwright-skill | `.claude/skills/playwright-skill/SKILL.md` |

### Core Skills

| Intent | Skill | Path |
|---|---|---|
| implement | dev | `.claude/skills/dev/SKILL.md` |
| error patterns | reflexion | `.claude/skills/reflexion/SKILL.md` |

## Step 4: Execute

If a skill matched:
1. Read the matched SKILL.md file completely
2. Follow its rules exactly
3. If delegating to a sub-agent, every prompt must begin with "First, read '.claude/skills/{skill}/SKILL.md' completely. Follow its rules exactly."

## Step 5: Ambiguity Fallback

If intent is unclear:

> I'm not sure which area you mean. Did you mean:
> A) **[Skill A]** — for [description]
> B) **[Skill B]** — for [description]

If no skill matches at all, respond normally.

## Multi-Skill Routing

Some tasks benefit from multiple skills. Common combinations:

| Task | Skills to Load |
|---|---|
| "Full SEO audit" | `seo-skill` + `seo-images` + `seo-structure-architect` |
| "Full quality check" | `web-quality-audit` (orchestrates all 5 quality skills) |
| "Build page with SEO" | `dev` + `seo-meta-optimizer` + `seo-structure-architect` |
| "Design + accessibility" | `frontend-design` + `accessibility` |
| "Test rebuilt page" | `webapp-testing` + `core-web-vitals` |
