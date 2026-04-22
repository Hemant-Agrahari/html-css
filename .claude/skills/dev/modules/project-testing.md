# Module: Project Testing Guide — OHS Gaming Static Site

## When This Module Applies

Use this module when:
- Fixing bugs on any page
- Adding new pages or content
- Comparing local site with original (ohsgaming.com)
- Validating popup behavior, images, FAQ, tabs
- Running Playwright-based automated tests

---

## Environment Setup

```bash
# Python path on this machine
PYTHON="C:/Users/Admin/AppData/Local/Programs/Python/Python312/python.exe"

# Always set encoding for Unicode output
PYTHONIOENCODING=utf-8

# Playwright is installed: version 1.58.0
# Browser: Chromium (headless)

# Local server
npx serve dist -p 5000 --no-port-switching

# Build before testing
node build.js
```

---

## Standard Test Pattern

Every page fix should follow this workflow:

```
1. CHECK ORIGINAL SITE FIRST (always!)
   ↓
2. COMPARE with local site using Playwright
   ↓
3. LIST all differences before fixing
   ↓
4. FIX issues one by one
   ↓
5. REBUILD: node build.js
   ↓
6. RE-TEST with Playwright to verify
```

---

## Test Functions

### 1. Image Audit

Counts loaded vs broken images on a page.

```python
imgs = page.evaluate('''() => {
    const all = document.querySelectorAll('img');
    let loaded = 0, broken = 0;
    all.forEach(img => { if (img.naturalWidth > 0) loaded++; else if (img.src) broken++; });
    return {total: all.length, loaded, broken};
}''')
```

**Common image issues:**
- `/_next/image?url=` proxy URLs → convert to `/assets/product_images/`
- `ohsapi.ohsgaming.com` URLs → convert to local paths
- Leftover `&w=48&q=75` params in filenames → strip them
- `templates%2F` encoded paths → decode to `/templates/`
- Missing files → download via Playwright browser fetch (direct HTTP gets 403)

### 2. Button → Modal Routing Test

Tests which popup each CTA button opens.

```python
# Click button
page.evaluate(f"() => {{ const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('{text}') && b.offsetHeight > 0 && !b.closest('.modal')); if(b) b.click(); }}")
page.wait_for_timeout(1200)

# Check which modal opened
grow = page.evaluate('() => !!document.querySelector("#growModal.show")')
contact = page.evaluate('() => !!document.querySelector("#contactModal.show")')
actual = 'growModal' if grow else ('contactModal' if contact else 'NONE')
```

**Routing rules:**
- Most buttons → contactModal (Get in Touch)
- Buttons with `data-modal="grow"` → growModal (David Levnis)
- ALWAYS verify against original site before routing

### 3. FAQ Accordion Test

Tests that accordion buttons open/close properly.

```python
# Click FAQ question
page.evaluate("() => { const b = Array.from(document.querySelectorAll('.accordion-button')).find(b => b.textContent.includes('?')); if(b) { b.scrollIntoView({block:'center'}); b.click(); } }")
page.wait_for_timeout(800)

# Verify it opened
faq = page.evaluate("() => { const b = ...; const t = b.getAttribute('data-bs-target'); const p = document.querySelector(t); return {h: p ? p.offsetHeight : 0}; }")
# PASS if height > 0
```

**Common FAQ issues:**
- Missing `data-bs-target` attribute → add from `aria-controls`
- Target pane ID doesn't exist → check spelling

### 4. Tab Switching Test

```python
# Click tab
page.evaluate("() => { const t = document.querySelector('[aria-controls=pane-id]'); if(t) t.click(); }")
page.wait_for_timeout(800)

# Verify pane visible
result = page.evaluate("() => { const p = document.getElementById('pane-id'); return {h: p.offsetHeight, d: p.style.display}; }")
```

**Common tab issues:**
- IDs with spaces → replace with hyphens
- Nested `tab-content` divs → use direct children only

### 5. Country Dropdown Test

```python
# Check count
count = page.evaluate('() => document.querySelector("select[name=country]").options.length')
# Should be 243 (242 countries + "Select Country")

# Test dial code sync
page.evaluate("() => { const s = document.querySelector('select[name=country]'); for(let i=0;i<s.options.length;i++){if(s.options[i].textContent==='India'){s.selectedIndex=i;s.dispatchEvent(new Event('change',{bubbles:true}));break;}} }")
code = page.evaluate('() => document.querySelector("input[name=countryCode]").value')
# Should be "+91"
```

### 6. CSS Comparison (Original vs Local)

```python
def get_styles(page, selector, props):
    return page.evaluate(f"() => {{ const el = document.querySelector('{selector}'); if(!el) return null; const s = window.getComputedStyle(el); const r = {{}}; {json.dumps(props)}.forEach(p => r[p] = s.getPropertyValue(p)); return r; }}")
```

### 7. Screenshot Comparison

```python
# Scroll through to trigger AOS first
total = page.evaluate('document.body.scrollHeight')
for y in range(0, total, 300):
    page.evaluate(f'window.scrollTo(0, {y})')
    page.wait_for_timeout(20)

# Then screenshot at key positions
page.evaluate('window.scrollTo(0, 0)')
page.screenshot(path='hero.png')
page.evaluate('window.scrollTo(0, 3000)')
page.screenshot(path='mid.png')
```

---

## Full Page Test Template

Use this template when testing a page end-to-end:

```python
PYTHON="C:/Users/Admin/AppData/Local/Programs/Python/Python312/python.exe"
PYTHONIOENCODING=utf-8 "$PYTHON" -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5000/{PAGE}', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # Scroll to trigger AOS
    total = page.evaluate('document.body.scrollHeight')
    for y in range(0, total, 500):
        page.evaluate(f'window.scrollTo(0, {y})')
        page.wait_for_timeout(15)
    page.wait_for_timeout(300)

    # 1. IMAGE AUDIT
    imgs = page.evaluate('''() => {
        const all = document.querySelectorAll('img');
        let loaded = 0, broken = 0;
        all.forEach(img => { if (img.naturalWidth > 0) loaded++; else if (img.src) broken++; });
        return {total: all.length, loaded, broken};
    }''')
    print(f'Images: {imgs[\"loaded\"]}/{imgs[\"total\"]} loaded, {imgs[\"broken\"]} broken')

    # 2. BUTTON ROUTING
    # ... test each CTA button

    # 3. FAQ TEST
    # ... click accordion, verify opens

    # 4. COUNTRY DROPDOWN
    # ... verify 243 countries, dial code sync

    page.close()
    browser.close()
"
```

---

## Known Issues to Skip

- **LeadConnector chat widget errors** — Third-party widget, not our code
- **Images broken on BOTH original and local** — API-served images that the original site also can't load
- **AOS hiding sections** — First 2 sections skip AOS; others require scroll to trigger

---

## Before Declaring a Page Complete

Run this checklist using Playwright:

1. **Images**: loaded > broken, no `/_next/image` or `ohsapi` URLs remaining
2. **Buttons**: every CTA opens correct popup (verified against original)
3. **FAQ**: accordion opens/closes on click
4. **Tabs**: switching works, correct pane shows
5. **Countries**: 243 options, dial code syncs on selection
6. **Console**: no errors (except chat widget)
7. **Visual**: screenshot comparison with original at hero, mid, bottom
