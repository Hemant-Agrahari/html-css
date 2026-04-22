import os
import re
from PIL import Image

ROOT = os.getcwd()
PAGES_DIR = os.path.join(ROOT, 'pages')
SHARED_DIR = os.path.join(ROOT, 'shared')
ASSETS_DIR = os.path.join(ROOT, 'assets', 'images')

# Patterns for images that should STAY eager (above-fold)
EAGER_PATTERNS = [
    r'logo', r'header', r'banner', r'hero', r'fetchpriority="high"'
]

def resolve_image_path(src, current_file_path):
    """Try to find the physical path for an image src."""
    # Clean src of query params/hashes
    clean_src = src.split('?')[0].split('#')[0]
    
    # 1. Absolute-ish paths like ../assets/images/...
    if clean_src.startswith('../'):
        # Determine how many levels up to go
        levels_up = clean_src.count('../')
        base_dir = current_file_path
        for _ in range(levels_up + 1):
            base_dir = os.path.dirname(base_dir)
        
        rel_path = clean_src.replace('../' * levels_up, '')
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path): return full_path

    # 2. Page-local assets (e.g. assets/foo.webp)
    local_assets = os.path.join(os.path.dirname(current_file_path), clean_src)
    if os.path.exists(local_assets): return local_assets
    
    # 3. Global assets/images folder
    global_assets = os.path.join(ROOT, clean_src.lstrip('/'))
    if os.path.exists(global_assets): return global_assets
    
    if 'assets/' in clean_src:
        global_assets_alt = os.path.join(ROOT, 'assets', clean_src.split('assets/')[-1])
        if os.path.exists(global_assets_alt): return global_assets_alt

    return None

def inject_attributes(file_path):
    print(f"  Processing: {os.path.relpath(file_path, ROOT)}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    img_count = 0
    modified = False
    
    def replacer(match):
        nonlocal img_count, modified
        tag = match.group(0)
        img_count += 1
        
        # 1. Extract src
        src_match = re.search(r'src=["\']([^"\']+)["\']', tag)
        if not src_match: return tag
        src = src_match.group(1)
        
        # 2. Get Dimensions
        img_path = resolve_image_path(src, file_path)
        width, height = None, None
        if img_path:
            try:
                with Image.open(img_path) as img:
                    width, height = img.size
            except Exception as e:
                print(f"    Error reading {src}: {e}")

        # 3. Build new attributes
        new_tag = tag.rstrip('/>').rstrip('>')
        
        # Add decoding="async" if missing
        if 'decoding=' not in new_tag:
            new_tag += ' decoding="async"'
            
        # Add dimensions if found and missing
        if width and height and 'width=' not in new_tag and 'height=' not in new_tag:
            new_tag += f' width="{width}" height="{height}"'
            
        # Add loading="lazy" or fetchpriority="high"
        is_hero = any(re.search(p, src, re.I) or re.search(p, tag, re.I) for p in EAGER_PATTERNS)
        
        if img_count == 1:
            if 'fetchpriority=' not in new_tag:
                new_tag += ' fetchpriority="high"'
        elif not is_hero and img_count > 3:
            if 'loading=' not in new_tag:
                new_tag += ' loading="lazy"'
        
        new_tag += ' /' if tag.endswith('/>') else ''
        new_tag += '>'
        
        if new_tag != tag:
            modified = True
            return new_tag
        return tag

    # Regex for <img> tags (including multi-line)
    new_content = re.sub(r'<img\b[^>]+?>', replacer, content, flags=re.I | re.S)
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    print("--- Injecting Performance Attributes & Dimensions ---")
    total_modified = 0
    
    for folder in [PAGES_DIR, SHARED_DIR]:
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.endswith('.html'):
                    if inject_attributes(os.path.join(root, file)):
                        total_modified += 1
                        
    print(f"\nTotal files updated: {total_modified}")

if __name__ == "__main__":
    main()
