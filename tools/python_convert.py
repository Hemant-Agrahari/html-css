import os
import re
from PIL import Image

ROOT = os.getcwd()
ASSETS_DIR = os.path.join(ROOT, 'assets', 'images')
PAGES_DIR = os.path.join(ROOT, 'pages')
SHARED_DIR = os.path.join(ROOT, 'shared')

def get_quality(filename):
    f = filename.lower()
    if any(p in f for p in ['background', 'bg_', '_bg.', 'banner', 'hero']):
        return 80
    return 85

def convert_images():
    print("--- Converting All Images to WebP (Root Scan) ---")
    converted_count = 0
    # Scan everything except known skip dirs
    for root, dirs, files in os.walk(ROOT):
        rel_root = os.path.relpath(root, ROOT)
        if any(skip in rel_root for skip in ['node_modules', '.git', '.backup_images', 'dist', '.gemini']):
            continue
            
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                src_path = os.path.join(root, file)
                webp_path = os.path.splitext(src_path)[0] + '.webp'
                
                # Skip if already exists
                if os.path.exists(webp_path):
                    continue
                
                try:
                    with Image.open(src_path) as img:
                        q = get_quality(file)
                        img.save(webp_path, 'webp', quality=q)
                        print(f"  Converted: {os.path.relpath(src_path, ROOT)} -> {os.path.basename(webp_path)} (q={q})")
                        converted_count += 1
                except Exception as e:
                    print(f"  Error converting {file}: {e}")
    print(f"Total images converted: {converted_count}")

def update_references():
    print("\n--- Updating References in HTML and CSS ---")
    # Extensions to replace
    exts = ['.png', '.jpg', '.jpeg', '.gif']
    # Regex to find these extensions in src="..." or url(...) or srcset="..."
    # We'll do a simple string replace for all matches of .png, .jpg, etc. followed by a quote or whitespace or paren
    
    update_count = 0
    for root, dirs, files in os.walk(ROOT):
        # Only scan relevant directories to avoid node_modules, etc.
        rel_root = os.path.relpath(root, ROOT)
        if any(skip in rel_root for skip in ['node_modules', '.git', '.backup_images', 'dist', '.gemini']):
            continue
            
        for file in files:
            if file.endswith(('.html', '.css', '.js')):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for ext in exts:
                    # Replace .png with .webp, etc.
                    # We look for the extension followed by something that isn't a letter or digit (to avoid mid-word replacements)
                    pattern = re.escape(ext) + r'(?=[ "\')\s,])'
                    new_content = re.sub(pattern, '.webp', new_content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"  Updated: {os.path.relpath(file_path, ROOT)}")
                    update_count += 1
    print(f"Total files updated: {update_count}")

if __name__ == "__main__":
    convert_images()
    update_references()
