"""Scrape missing pages from live site and create page files."""
from playwright.sync_api import sync_playwright
import re, os, json

pages_to_scrape = [
    {"url": "https://www.ohsgaming.com/custom-sweepstakes-software-development-services", "slug": "custom-sweepstakes-software-development-services"},
    {"url": "https://www.ohsgaming.com/buy-online-sweepstakes-platform", "slug": "buy-online-sweepstakes-platform"},
    {"url": "https://www.ohsgaming.com/sweepstake-casino-platform", "slug": "sweepstake-casino-platform"},
]

scraped_dir = "F:/HermitSirTask/ohshtml/scraped"
pages_dir = "F:/HermitSirTask/ohshtml/pages"


def clean_html(html):
    idx = html.find("</header>")
    if idx != -1:
        html = html[idx + len("</header>"):]
    idx = html.find("<footer")
    if idx != -1:
        html = html[:idx]
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
    html = re.sub(r"<next-route-announcer.*?</next-route-announcer>", "", html, flags=re.DOTALL)
    html = re.sub(r'\s*data-nimg="[^"]*"', "", html)
    html = re.sub(r'\s*style="color:transparent"', "", html)
    html = re.sub(r'\s*decoding="async"', "", html)
    html = re.sub(r"<chat-widget[^>]*>.*?</chat-widget>", "", html, flags=re.DOTALL)
    html = re.sub(r"<lc-[^>]*>.*?</lc-[^>]*>", "", html, flags=re.DOTALL)
    html = re.sub(r"<notification-banner[^>]*>.*?</notification-banner>", "", html, flags=re.DOTALL)
    html = re.sub(r"<noscript>.*?</noscript>", "", html, flags=re.DOTALL)
    html = html.replace("<!-- -->", "")
    html = re.sub(r"<!--\$-->.*?<!--/\$-->", "", html, flags=re.DOTALL)
    # Remove footer-top "Area We Serve" (added via component)
    html = re.sub(r'<div class="footer-top[^"]*".*?</div>\s*</div>\s*</div>\s*$', "", html, flags=re.DOTALL)
    # Remove stray empty header at start
    html = re.sub(r"^<header[^>]*></header>", "", html)
    return html.strip()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    for pg in pages_to_scrape:
        slug = pg["slug"]
        url = pg["url"]
        print(f"\nScraping: {slug}...")

        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        try:
            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(3000)

            # Scroll to trigger lazy loads
            page.evaluate("""async () => {
                const d = ms => new Promise(r => setTimeout(r, ms));
                for (let y = 0; y < document.body.scrollHeight; y += 300) {
                    window.scrollTo(0, y); await d(80);
                }
                window.scrollTo(0, 0); await d(500);
            }""")
            page.wait_for_timeout(1000)

            full_html = page.content()

            # Save raw desktop HTML
            html_dir = os.path.join(scraped_dir, slug, "html")
            os.makedirs(html_dir, exist_ok=True)
            raw_path = os.path.join(html_dir, f"{slug}-desktop.html")
            with open(raw_path, "w", encoding="utf-8") as f:
                f.write(full_html)
            print(f"  Saved raw HTML: {len(full_html)} chars")

            # Extract SEO metadata
            seo = page.evaluate("""() => {
                const title = document.title || '';
                const descEl = document.querySelector('meta[name="description"]');
                const kwEl = document.querySelector('meta[name="keywords"]');
                const robotsEl = document.querySelector('meta[name="robots"]');
                return {
                    title: title,
                    desc: descEl ? descEl.content : '',
                    kw: kwEl ? kwEl.content : '',
                    robots: robotsEl ? robotsEl.content : 'index, follow'
                };
            }""")

            # Save SEO
            seo_dir = os.path.join(scraped_dir, slug, "seo")
            os.makedirs(seo_dir, exist_ok=True)
            with open(os.path.join(seo_dir, f"metadata-{slug}.json"), "w", encoding="utf-8") as f:
                json.dump({"slug": slug, "url": url, "metadata": {
                    "title": {"content": seo["title"], "length": len(seo["title"])},
                    "description": {"content": seo["desc"], "length": len(seo["desc"])},
                    "keywords": seo["kw"],
                    "robots": seo["robots"],
                }}, f, indent=2, ensure_ascii=False)

            # Clean content
            main_content = clean_html(full_html)
            print(f"  Main content: {len(main_content)} chars")

            # Build frontmatter
            title = seo["title"]
            desc = seo["desc"]
            if len(desc) > 160:
                desc = desc[:157] + "..."
            kw = seo["kw"]
            kw_list = ", ".join([k.strip() for k in kw.split(",") if k.strip()][:6]) if kw else ""
            robots = seo["robots"] or "index, follow"

            lines = []
            lines.append("---")
            lines.append(f'title: "{title}"')
            lines.append(f'description: "{desc}"')
            lines.append(f"canonical: /{slug}")
            lines.append("css: service.css")
            if kw_list:
                lines.append(f'keywords: "{kw_list}"')
            lines.append(f"robots: {robots}")
            lines.append("nav_active: products")
            lines.append("og:")
            lines.append(f'  title: "{title}"')
            lines.append(f'  description: "{desc}"')
            lines.append("schema:")
            lines.append("  type: Product")
            lines.append(f'  name: "{slug.replace("-", " ").title()}"')
            lines.append("---")
            lines.append("")
            lines.append("{{header}}")
            lines.append("")
            lines.append("<main>")
            lines.append(main_content)
            lines.append("</main>")
            lines.append("")
            lines.append("{{area-serve}}")
            lines.append("{{footer}}")
            lines.append("{{chat-widget}}")

            page_path = os.path.join(pages_dir, f"{slug}.html")
            with open(page_path, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

            print(f"  Title: {title[:60]}")
            print(f"  Page created: {slug}.html")

        except Exception as e:
            print(f"  ERROR: {e}")
        finally:
            ctx.close()

    browser.close()

print("\nDone!")
