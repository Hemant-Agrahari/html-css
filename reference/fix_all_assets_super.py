import os
import subprocess
import re
from pathlib import Path

all_pages_dir = "pages"
all_pages = [p for p in os.listdir(all_pages_dir) if os.path.isdir(os.path.join(all_pages_dir, p))]

def resolve_path(current_page_dir, rel_path):
    abs_path = os.path.normpath(os.path.join(current_page_dir, rel_path))
    if os.path.exists(abs_path) and os.path.isfile(abs_path):
        return abs_path
    
    # Try common alternatives if broken
    # E.g. if it's ../../assets/images/foo.webp but it's actually in ../../shared/assets/images/
    # (Just an example, customize if needed)
    return None

def fix_html_assets(page, page_path, assets_dir):
    content_html = os.path.join(page_path, "content.html")
    if not os.path.exists(content_html): return False
    
    with open(content_html, "r", encoding="utf8") as f:
        content = f.read()
        
    modified = False
    
    # 1. Fix src="..."
    def replacer_src(match):
        rel_path = match.group(1)
        if f"pages/{page}/assets/" in rel_path: return match.group(0)
        
        full_path = resolve_path(page_path, rel_path)
        if full_path:
            filename = os.path.basename(full_path)
            local_dest = os.path.join(assets_dir, filename)
            if not os.path.exists(local_dest):
                subprocess.run(["cp", full_path, local_dest], capture_output=True)
            return f'src="../../pages/{page}/assets/{filename}"'
        return match.group(0)

    # 2. Fix srcset="..."
    def replacer_srcset(match):
        srcset_val = match.group(1)
        parts = srcset_val.split(",")
        new_parts = []
        for part in parts:
            part = part.strip()
            if not part: continue
            words = part.split()
            rel_path = words[0]
            full_path = resolve_path(page_path, rel_path)
            if full_path:
                filename = os.path.basename(full_path)
                local_dest = os.path.join(assets_dir, filename)
                if not os.path.exists(local_dest):
                    subprocess.run(["cp", full_path, local_dest], capture_output=True)
                new_rel = f"../../pages/{page}/assets/{filename}"
                new_parts.append(f"{new_rel} {' '.join(words[1:])}".strip())
            else:
                new_parts.append(part)
        return f'srcset="{", ".join(new_parts)}"'

    new_content = re.sub(r'src="(\.\./\.\./[^"]+)"', replacer_src, content)
    new_content = re.sub(r'srcset="([^"]+)"', replacer_srcset, new_content)
    
    if new_content != content:
        with open(content_html, "w", encoding="utf8") as f:
            f.write(new_content)
        return True
    return False

def fix_css_assets(page, page_path, assets_dir):
    # Find all .css files in the page directory
    css_files = [f for f in os.listdir(page_path) if f.endswith(".css")]
    any_modified = False
    for css_file in css_files:
        css_path = os.path.join(page_path, css_file)
        with open(css_path, "r", encoding="utf8") as f:
            content = f.read()
        
        def replacer_url(match):
            rel_path = match.group(1).replace("'", "").replace('"', "")
            # If it's already in assets/, skip
            if rel_path.startswith("assets/"): return match.group(0)
            
            full_path = resolve_path(page_path, rel_path)
            if full_path:
                filename = os.path.basename(full_path)
                local_dest = os.path.join(assets_dir, filename)
                if not os.path.exists(local_dest):
                    subprocess.run(["cp", full_path, local_dest], capture_output=True)
                return f'url("assets/{filename}")'
            return match.group(0)

        new_content = re.sub(r'url\((.+?)\)', replacer_url, content)
        if new_content != content:
            with open(css_path, "w", encoding="utf8") as f:
                f.write(new_content)
            any_modified = True
    return any_modified

count = 0
for page in all_pages:
    page_path = os.path.join(all_pages_dir, page)
    assets_dir = os.path.join(page_path, "assets")
    if not os.path.exists(assets_dir): os.makedirs(assets_dir)
    
    m1 = fix_html_assets(page, page_path, assets_dir)
    m2 = fix_css_assets(page, page_path, assets_dir)
    if m1 or m2: count += 1

print(f"Super Localizer fixed assets for {count} pages.")
