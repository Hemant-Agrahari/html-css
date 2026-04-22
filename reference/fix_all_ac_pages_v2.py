import os
import subprocess
import re

# 1. Identify all AC/HVAC related pages
ac_search_pattern = ["air-condition", "ac-", "hvac", "ductless", "thermostat", "heater", "furnace", "heat-pump", "-ac"]
all_pages = os.listdir("pages")
ac_pages = []
for page in all_pages:
    if any(pattern in page.lower() for pattern in ac_search_pattern):
        if os.path.isdir(os.path.join("pages", page)):
            ac_pages.append(page)

print(f"Found {len(ac_pages)} AC/HVAC-related pages.")

# Comprehensive mappings
mappings = {
    # Icons
    "../../assets/icons/icon-free-estimate.webp": "free-estimate.webp",
    "../../assets/images/free-estimate.webp": "free-estimate.webp",
    "../../assets/icons/icon-free-service-call.webp": "free-service-call.webp",
    "../../assets/images/free-service-call.webp": "free-service-call.webp",
    "../../assets/icons/icon-discount.webp": "discount-available.webp",
    "../../assets/images/discount-available.webp": "discount-available.webp",
    "../../assets/icons/icon-financing.webp": "finance-service.webp",
    "../../assets/images/finance-service.webp": "finance-service.webp",
    "../../assets/icons/icon-star.webp": "star.webp",
    "../../assets/images/star.webp": "star.webp",
    "../../assets/icons/icon-call-green.webp": "icon-call-green.webp",
    "../../assets/images/icon-call-green.webp": "icon-call-green.webp",
    "../../assets/images/247-service.webp": "247-service.webp",
    "../../assets/icons/chevronrightdouble.svg": "chevronrightdouble.svg",
    "../../assets/images/banner-bg.webp": "banner-bg.webp",
    "../../assets/icons/plus.webp": "plus.webp",
    "../../assets/icons/less.webp": "less.webp",
    "../../assets/images/plus.webp": "plus.webp",
    "../../assets/images/less.webp": "less.webp",
    # Specific known images that were sometimes globally linked
    "../../assets/images/thermostat-advantage.webp": "Signs-of-a-Gas-Leak.webp",
}

# 2. Distribute and Fix
for page in ac_pages:
    assets_dir = os.path.join("pages", page, "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # Pre-copy some basics if missing
    for src, local_name in mappings.items():
        # Derive src path from global assets
        global_src = src.replace("../../", "")
        if os.path.exists(global_src):
            dest_path = os.path.join(assets_dir, local_name)
            if not os.path.exists(dest_path):
                subprocess.run(["cp", global_src, dest_path], capture_output=True)

    # Fix paths in content.html
    content_path = os.path.join("pages", page, "content.html")
    if os.path.exists(content_path):
        with open(content_path, "r", encoding="utf8") as f:
            content = f.read()
        
        for old_path, local_name in mappings.items():
            new_path = f"../../pages/{page}/assets/{local_name}"
            content = content.replace(old_path, new_path)
        
        # Catch any remaining ../../assets/icons/ or ../../assets/images/
        # and try to point them to local assets with same name if they exist
        def replace_remaining(match):
            full_match = match.group(0)
            img_name = match.group(2)
            local_path = os.path.join("pages", page, "assets", img_name)
            if os.path.exists(local_path):
                return f'src="../../pages/{page}/assets/{img_name}"'
            return full_match

        content = re.sub(r'src="../../assets/(images|icons)/([^"]+)"', replace_remaining, content)

        with open(content_path, "w", encoding="utf8") as f:
            f.write(content)

print("Comprehensive fix completed.")
