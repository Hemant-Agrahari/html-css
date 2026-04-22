import os
import subprocess
import re
from pathlib import Path

all_pages_dir = "pages"
if not os.path.exists(all_pages_dir):
    print("Pages directory not found.")
    exit(1)

all_pages = os.listdir(all_pages_dir)
count = 0

def resolve_path(current_page_dir, rel_path):
    # rel_path is something like "../../assets/images/foo.webp" 
    # or "../../pages/other-page/assets/bar.webp"
    # Resolve to absolute path relative to project root
    abs_path = os.path.normpath(os.path.join(current_page_dir, rel_path))
    if os.path.exists(abs_path) and os.path.isfile(abs_path):
        return abs_path
    
    # Try alternative: maybe the link was already partially fixed or broken
    # If it starts with ../../pages/, it might be pointing to its own or sibling
    return None

for page in all_pages:
    page_path = os.path.join(all_pages_dir, page)
    if not os.path.isdir(page_path):
        continue
    
    content_html = os.path.join(page_path, "content.html")
    if not os.path.exists(content_html):
        continue
    
    assets_dir = os.path.join(page_path, "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
        
    with open(content_html, "r", encoding="utf8") as f:
        content = f.read()
    
    # Find all src="..." and srcset="..." (simple regex)
    # We look for patterns like src="../../..."
    patterns = [
        r'src="(\.\./\.\./[^"]+)"',
        r'srcset="([^"]+)"'
    ]
    
    modified = False
    
    def replacer_src(match):
        rel_path = match.group(1)
        # Skip if it already points to its own assets correctly
        if f"pages/{page}/assets/" in rel_path:
            return match.group(0)
            
        full_path = resolve_path(page_path, rel_path)
        if full_path:
            filename = os.path.basename(full_path)
            local_dest = os.path.join(assets_dir, filename)
            if not os.path.exists(local_dest):
                subprocess.run(["cp", full_path, local_dest], capture_output=True)
            return f'src="../../pages/{page}/assets/{filename}"'
        return match.group(0)

    def replacer_srcset(match):
        srcset_val = match.group(1)
        # Example: "../../assets/images/foo.webp 375w, ..."
        parts = srcset_val.split(",")
        new_parts = []
        for part in parts:
            part = part.strip()
            if not part: continue
            words = part.split()
            if not words: continue
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
        modified = True
        count += 1

print(f"Universal localization fixed {count} pages.")
