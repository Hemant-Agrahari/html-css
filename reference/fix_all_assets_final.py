import os
import subprocess
import re

all_pages_dir = "pages"
if not os.path.exists(all_pages_dir):
    print("Pages directory not found.")
    exit(1)

all_pages = os.listdir(all_pages_dir)
count = 0

for page in all_pages:
    page_path = os.path.join(all_pages_dir, page)
    if not os.path.isdir(page_path):
        continue
    
    content_path = os.path.join(page_path, "content.html")
    if not os.path.exists(content_path):
        continue
    
    assets_dir = os.path.join(page_path, "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
        
    with open(content_path, "r", encoding="utf8") as f:
        content = f.read()
    
    # regex to find all ../../assets/images/ or ../../assets/icons/
    pattern = r'src="../../assets/(images|icons)/([^"]+)"'
    
    def localize_asset(match):
        folder = match.group(1)
        filename = match.group(2)
        global_path = os.path.join("assets", folder, filename)
        
        if os.path.exists(global_path):
            local_dest = os.path.join(assets_dir, filename)
            if not os.path.exists(local_dest):
                subprocess.run(["cp", global_path, local_dest], capture_output=True)
            return f'src="../../pages/{page}/assets/{filename}"'
        else:
            # If not found in global, maybe it's already localized? 
            # Or maybe it's just a broken link we can't fix here.
            return match.group(0)

    new_content = re.sub(pattern, localize_asset, content)
    
    if new_content != content:
        with open(content_path, "w", encoding="utf8") as f:
            f.write(new_content)
        count += 1

print(f"Final localization fixed {count} pages.")
