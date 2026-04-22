"""Download broken images from live site using browser fetch."""
from playwright.sync_api import sync_playwright
import base64, os

out_dir = "F:/HermitSirTask/ohshtml/assets/product_images"

broken_files = [
    "white-label-igaming-platform-works.webp",
    "extensive-game-library.svg",
    "multi-device-and-mobile-first.svg",
    "seamless-payment-integrations.svg",
    "custom-branding-and-ux.svg",
    "powerful-back-office-and-analytics.svg",
    "compliance-ready-and-multi-market-support.svg",
    "pre-launch-solutions-and-setup.svg",
    "post-launch-support-and-growth.svg",
    "responsive-web-and-mobile-first-design.svg",
    "native-apps-vs-web-apps.svg",
    "ux-ui-customisation-for-your-brand.svg",
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(
        "https://www.ohsgaming.com/white-label-igaming-platform",
        wait_until="networkidle",
        timeout=60000,
    )
    page.wait_for_timeout(3000)

    # Scroll to load all images
    page.evaluate(
        """async () => {
        const d = ms => new Promise(r => setTimeout(r, ms));
        for (let y = 0; y < document.body.scrollHeight; y += 300) {
            window.scrollTo(0, y); await d(60);
        }
    }"""
    )
    page.wait_for_timeout(2000)

    # Get ALL image src -> actual loaded src mapping
    all_imgs = page.evaluate(
        """() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            attrSrc: img.getAttribute('src') || '',
            w: img.naturalWidth,
        })).filter(i => i.w > 0 && i.src.includes('product_images'));
    }"""
    )

    print(f"Found {len(all_imgs)} loaded product images on live site")

    # Build lookup: filename -> full URL
    url_map = {}
    for img in all_imgs:
        from urllib.parse import unquote

        fname = unquote(img["src"].split("/")[-1].split("?")[0])
        url_map[fname] = img["src"]
        # Also map normalized version
        norm = fname.replace("\u2011", "-")
        url_map[norm] = img["src"]

    fixed = 0
    for fname in broken_files:
        # Find the URL for this file
        url = url_map.get(fname)

        if not url:
            # Try partial match
            for k, v in url_map.items():
                if fname.replace("-", "") in k.replace("-", "").replace("\u2011", ""):
                    url = v
                    break

        if not url:
            # Try direct API URL
            url = f"https://ohsapi.ohsgaming.com/product_images/{fname}"

        # Download via browser fetch (handles CORS, encoding)
        data = page.evaluate(
            """async (url) => {
            try {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                const buf = await resp.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                return btoa(binary);
            } catch(e) { return null; }
        }""",
            url,
        )

        if data:
            content = base64.b64decode(data)
            fpath = os.path.join(out_dir, fname)
            with open(fpath, "wb") as f:
                f.write(content)
            fixed += 1
            print(f"  OK {len(content):>6} bytes: {fname}")
        else:
            print(f"  FAIL: {fname} (url: {url[:60]})")

    print(f"\nFixed {fixed}/{len(broken_files)} images")

    ctx.close()
    browser.close()
