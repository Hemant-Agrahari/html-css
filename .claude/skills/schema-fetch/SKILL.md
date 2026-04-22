---
name: schema-fetch
description: Fetch, validate, and add JSON-LD structured data (schema.org) to any static site. Use when adding structured data, fixing schema markup, or auditing JSON-LD on pages.
license: MIT
metadata:
  author: dev-skills
  version: "1.0"
---

# Schema Fetch & Inject

Fetch structured data from production/original sites, validate it, generate templates, and inject into static HTML pages. Works with any static site project.

## When to Use

- Adding structured data to pages that don't have it
- Copying schema from a production CMS site to a static rebuild
- Validating existing JSON-LD blocks
- Fixing broken or incomplete structured data
- SEO audit requiring schema markup

---

## Step 1: Fetch Schema from Production Site

### Using Node.js (recommended for static site projects)

```javascript
// fetch-schema.js — Extracts all JSON-LD from any URL
const https = require('https');
const http = require('http');

const url = process.argv[2] || 'https://example.com';
const client = url.startsWith('https') ? https : http;

client.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    if (matches.length === 0) {
      console.log('No JSON-LD found on', url);
      return;
    }
    matches.forEach((m, i) => {
      const json = m.replace(/<\/?script[^>]*>/g, '');
      try {
        const parsed = JSON.parse(json);
        console.log(`\n=== Schema ${i + 1}: ${parsed['@type'] || 'Unknown'} ===`);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(`\n=== Schema ${i + 1}: PARSE ERROR ===`);
        console.log('Error:', e.message);
        console.log('Raw:', json.substring(0, 200));
      }
    });
  });
});
```

**Usage:**
```bash
node fetch-schema.js https://example.com/page-slug
```

### Using Playwright (for JS-rendered sites)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('https://example.com/page', wait_until='networkidle')

    schemas = page.evaluate('''() => {
        return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => {
                try { return {valid: true, data: JSON.parse(s.textContent)}; }
                catch(e) { return {valid: false, error: e.message}; }
            });
    }''')

    for s in schemas:
        if s['valid']:
            print(f"Type: {s['data'].get('@type', '?')}")
            import json
            print(json.dumps(s['data'], indent=2))
        else:
            print(f"INVALID: {s['error']}")

    browser.close()
```

### Bulk Fetch (all pages)

```javascript
// fetch-all-schemas.js — Fetch schema from multiple pages
const https = require('https');
const pages = ['/', '/about', '/contact', '/services']; // adjust per site
const baseUrl = 'https://example.com';

async function fetchSchema(path) {
  return new Promise((resolve) => {
    https.get(baseUrl + path, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
        const schemas = matches.map(m => {
          try { return JSON.parse(m.replace(/<\/?script[^>]*>/g, '')); }
          catch(e) { return null; }
        }).filter(Boolean);
        resolve({path, schemas});
      });
    });
  });
}

(async () => {
  for (const path of pages) {
    const result = await fetchSchema(path);
    console.log(`\n${result.path}: ${result.schemas.length} schemas`);
    result.schemas.forEach(s => console.log(`  - ${s['@type']}`));
  }
})();
```

---

## Step 2: Schema Templates

### Organization (homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "COMPANY_NAME",
  "url": "https://DOMAIN",
  "logo": "https://DOMAIN/assets/images/logo.webp",
  "description": "COMPANY_DESCRIPTION",
  "sameAs": [
    "https://www.linkedin.com/company/HANDLE",
    "https://twitter.com/HANDLE"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "EMAIL",
    "contactType": "customer service"
  }
}
```

### WebSite (homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "COMPANY_NAME",
  "url": "https://DOMAIN",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://DOMAIN/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### Service (service/product pages)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "SERVICE_NAME",
  "description": "SERVICE_DESCRIPTION",
  "provider": {
    "@type": "Organization",
    "name": "COMPANY_NAME",
    "url": "https://DOMAIN"
  },
  "serviceType": "SERVICE_CATEGORY",
  "areaServed": "Worldwide",
  "url": "https://DOMAIN/SERVICE_SLUG"
}
```

### SoftwareApplication (software product pages)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SOFTWARE_NAME",
  "description": "SOFTWARE_DESCRIPTION",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Custom pricing available"
  },
  "provider": {
    "@type": "Organization",
    "name": "COMPANY_NAME"
  }
}
```

### FAQPage (pages with FAQ sections)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "QUESTION_TEXT",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ANSWER_TEXT"
      }
    }
  ]
}
```

**Auto-generate from HTML:**
```javascript
// Extract FAQ from accordion HTML
node -e '
const fs = require("fs");
const html = fs.readFileSync("dist/PAGE.html", "utf8");
const qas = [];
const re = /accordion-button[^>]*>([\s\S]*?)<\/button>[\s\S]*?accordion-body[^>]*>([\s\S]*?)<\/div>/g;
let m;
while ((m = re.exec(html)) !== null) {
  qas.push({
    "@type": "Question",
    "name": m[1].replace(/<[^>]+>/g, "").trim(),
    "acceptedAnswer": {
      "@type": "Answer",
      "text": m[2].replace(/<[^>]+>/g, "").trim()
    }
  });
}
const schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qas};
console.log(JSON.stringify(schema, null, 2));
'
```

### BreadcrumbList (all pages)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://DOMAIN"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "PAGE_TITLE",
      "item": "https://DOMAIN/PAGE_SLUG"
    }
  ]
}
```

### WebPage (all pages)

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "PAGE_TITLE",
  "description": "PAGE_DESCRIPTION",
  "url": "https://DOMAIN/PAGE_SLUG",
  "isPartOf": {
    "@type": "WebSite",
    "name": "COMPANY_NAME",
    "url": "https://DOMAIN"
  }
}
```

### HowTo (step-by-step process pages)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "HOW_TO_TITLE",
  "description": "HOW_TO_DESCRIPTION",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "STEP_TITLE",
      "text": "STEP_DESCRIPTION"
    }
  ]
}
```

---

## Step 3: Inject Schema into Pages

### Method A: Inline in content HTML

Add directly in the page content file:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
</script>
```

### Method B: YAML frontmatter (if build system supports it)

```yaml
---
title: "Page Title"
schema:
  - type: Service
    name: "Service Name"
    description: "Service description"
  - type: FAQPage
    # auto-generated from accordion content
---
```

### Method C: Build script injection

Add schema injection to the build script:

```javascript
// In build.js — inject schema into <head> based on page type
function generateSchema(page) {
  const schemas = [];

  // BreadcrumbList for all pages
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl},
      {"@type": "ListItem", "position": 2, "name": page.title, "item": siteUrl + page.canonical}
    ]
  });

  // FAQPage if page has accordion
  if (page.content.includes('accordion-button')) {
    const faq = extractFAQ(page.content);
    if (faq.length > 0) {
      schemas.push({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq});
    }
  }

  return schemas.map(s =>
    `<script type="application/ld+json">${JSON.stringify(s)}</script>`
  ).join('\n');
}
```

---

## Step 4: Validate

### In-browser validation (Playwright)

```python
schemas = page.evaluate('''() => {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => {
            try {
                const d = JSON.parse(s.textContent);
                const issues = [];
                if (!d['@context']) issues.push('missing @context');
                if (!d['@type']) issues.push('missing @type');
                return {valid: issues.length === 0, type: d['@type'], issues};
            } catch(e) {
                return {valid: false, error: e.message};
            }
        });
}''')
```

### Google Rich Results Test

```bash
# Open in browser for manual testing
open "https://search.google.com/test/rich-results?url=https://DOMAIN/PAGE"
```

### Schema.org Validator

```bash
open "https://validator.schema.org/"
# Paste HTML or URL
```

### Automated validation with node

```javascript
// validate-schema.js — Check all pages for valid JSON-LD
const fs = require('fs');
const path = require('path');

const distDir = 'dist';
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const html = fs.readFileSync(path.join(distDir, file), 'utf8');
  const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];

  const types = [];
  let errors = 0;

  matches.forEach(m => {
    const json = m.replace(/<\/?script[^>]*>/g, '');
    try {
      const data = JSON.parse(json);
      types.push(data['@type'] || 'unknown');
    } catch (e) {
      errors++;
    }
  });

  const status = errors > 0 ? 'FAIL' : (matches.length > 0 ? 'OK' : 'NONE');
  console.log(`${status} ${file}: ${matches.length} schemas [${types.join(', ')}]${errors ? ` (${errors} parse errors)` : ''}`);
});
```

---

## Expected Schema Per Page Type

| Page Type | Required Schemas | Optional |
|-----------|-----------------|----------|
| Homepage | Organization, WebSite, BreadcrumbList | |
| Service page | Service, BreadcrumbList | FAQPage, HowTo |
| Software/product | SoftwareApplication, BreadcrumbList | FAQPage, AggregateRating |
| Legal (privacy, cookie) | WebPage, BreadcrumbList | |
| Contact | WebPage, BreadcrumbList | LocalBusiness |
| About | WebPage, BreadcrumbList | Organization |
| Blog/article | Article, BreadcrumbList | |
| All pages | BreadcrumbList (minimum) | |

---

## Quick Reference

```bash
# Fetch schema from a URL
node -e 'require("https").get("URL", r => { let d=""; r.on("data",c=>d+=c); r.on("end",()=>{ (d.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)||[]).forEach(m=>{ try{console.log(JSON.stringify(JSON.parse(m.replace(/<\/?script[^>]*>/g,"")),null,2))}catch(e){console.log("ERR",e.message)} }) }) })'

# Validate all pages in dist/
node -e 'require("fs").readdirSync("dist").filter(f=>f.endsWith(".html")).forEach(f=>{ const h=require("fs").readFileSync("dist/"+f,"utf8"); const m=h.match(/<script type="application\/ld\+json">/g)||[]; console.log(f+":",m.length,"schemas") })'

# Count pages missing schema
node -e 'let missing=0; require("fs").readdirSync("dist").filter(f=>f.endsWith(".html")).forEach(f=>{ const h=require("fs").readFileSync("dist/"+f,"utf8"); if(!h.includes("application/ld+json")){missing++;console.log("MISSING:",f)} }); console.log(missing,"pages without schema")'
```
