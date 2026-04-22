import os
import sys
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import asyncio
from playwright.async_api import async_playwright

# Configuration
TARGET_URL = "https://www.ezheatandair.com/san-diego-gas-line-repair-replacement"
OUTPUT_DIR = "cloned_page"
FOLDERS = {
    "html": "",
    "css": "css",
    "js": "js",
    "asset": "asset"
}

# Regex to find background-image URLs in CSS
CSS_URL_REGEX = r'url\((?!["\']?data:)(["\']?)([^)]*)\1\)'

async def download_asset(url, folder_path):
    """Downloads an asset and returns its local relative path."""
    if not url or url.startswith("data:"):
        return url
    
    try:
        parsed = urlparse(url)
        filename = os.path.basename(parsed.path)
        if not filename:
            filename = "index.html" # Fallback
            
        # Clean filename
        filename = re.sub(r'[?#].*$', '', filename)
        if not filename:
             filename = "asset_" + str(hash(url))
             
        local_path = os.path.join(folder_path, filename)
        
        # Avoid re-downloading
        if os.path.exists(local_path):
            return filename

        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(local_path, "wb") as f:
                f.write(response.content)
            return filename
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        
    return url

async def clone_page():
    print(f"Starting clone of {TARGET_URL}...")
    
    # Create directory structure
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    for folder in FOLDERS.values():
        if folder:
            path = os.path.join(OUTPUT_DIR, folder)
            if not os.path.exists(path):
                os.makedirs(path)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()
        
        # Load page and wait for everything to settle
        await page.goto(TARGET_URL, wait_until="networkidle")
        
        # Get fully rendered DOM
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # 1. Remove Tracking Scripts and Common Layout Components
        tracking_patterns = [
            'googletagmanager.com', 'google-analytics.com', 'facebook.net', 
            'pixel', 'tracking', 'analytics', 'hotjar'
        ]
        
        # Elements to remove (Header, Footer, Chat, etc.)
        remove_selectors = [
            'header.page-header', 
            'footer.new-footer',
            'chat-widget',
            'ul.right-sidebar-btn',
            'div.Toastify',
            'iframe[src*="google.com/maps"]', # Maps can be huge
            'script[src*="google-analytics"]',
            'script[src*="googletagmanager"]'
        ]

        for script in soup.find_all('script'):
            src = script.get('src', '')
            if any(pattern in src for pattern in tracking_patterns) or any(pattern in script.text for pattern in tracking_patterns):
                script.decompose()
        
        for noscript in soup.find_all('noscript'):
            if any(pattern in noscript.text for pattern in tracking_patterns):
                noscript.decompose()

        # Remove common layout components
        for selector in remove_selectors:
            for element in soup.select(selector):
                print(f"Removing component: {selector}")
                element.decompose()

        # 2. Localize CSS
        css_dir = os.path.join(OUTPUT_DIR, FOLDERS['css'])
        for link in soup.find_all('link', rel='stylesheet'):
            href = link.get('href')
            if href:
                full_url = urljoin(TARGET_URL, href)
                local_name = await download_asset(full_url, css_dir)
                link['href'] = f"{FOLDERS['css']}/{local_name}"

        # 3. Localize JS
        js_dir = os.path.join(OUTPUT_DIR, FOLDERS['js'])
        for script in soup.find_all('script', src=True):
            src = script.get('src')
            if src:
                full_url = urljoin(TARGET_URL, src)
                local_name = await download_asset(full_url, js_dir)
                script['src'] = f"{FOLDERS['js']}/{local_name}"

        # 4. Localize Images and Assets
        asset_dir = os.path.join(OUTPUT_DIR, FOLDERS['asset'])
        
        # Img tags
        for img in soup.find_all('img'):
            src = img.get('src')
            if src:
                full_url = urljoin(TARGET_URL, src)
                local_name = await download_asset(full_url, asset_dir)
                img['src'] = f"{FOLDERS['asset']}/{local_name}"
            
            # Handle srcset
            srcset = img.get('srcset')
            if srcset:
                new_srcset = []
                for entry in srcset.split(','):
                    parts = entry.strip().split(' ')
                    if parts:
                        url = parts[0]
                        full_url = urljoin(TARGET_URL, url)
                        local_name = await download_asset(full_url, asset_dir)
                        parts[0] = f"{FOLDERS['asset']}/{local_name}"
                        new_srcset.append(' '.join(parts))
                img['srcset'] = ', '.join(new_srcset)

        # 5. Handle inline styles with background images
        for tag in soup.find_all(style=True):
            style = tag['style']
            matches = re.finditer(CSS_URL_REGEX, style)
            for match in matches:
                url = match.group(2).strip("'\"")
                full_url = urljoin(TARGET_URL, url)
                local_name = await download_asset(full_url, asset_dir)
                tag['style'] = style.replace(url, f"{FOLDERS['asset']}/{local_name}")

        # 6. Save final HTML
        output_path = os.path.join(OUTPUT_DIR, "index.html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(soup.prettify())

        await browser.close()
        print(f"Successfully cloned page to {OUTPUT_DIR}/index.html")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        TARGET_URL = sys.argv[1]
    asyncio.run(clone_page())
