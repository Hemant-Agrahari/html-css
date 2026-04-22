import os
import subprocess
import glob

# 1. Identify all AC-related pages
ac_search_pattern = ["air-condition", "ac", "hvac", "ductless"]
all_pages = os.listdir("pages")
ac_pages = []
for page in all_pages:
    if any(pattern in page.lower() for pattern in ac_search_pattern):
        if os.path.isdir(os.path.join("pages", page)):
            ac_pages.append(page)

print(f"Found {len(ac_pages)} AC-related pages.")

# Common icons to distribute
icons = {
    "icon-free-estimate.webp": "free-estimate.webp",
    "icon-free-service-call.webp": "free-service-call.webp",
    "icon-discount.webp": "discount-available.webp",
    "icon-financing.webp": "finance-service.webp",
    "icon-star.webp": "star.webp",
    "icon-call-green.webp": "icon-call-green.webp",
    "247-service.webp": "247-service.webp"
}

# 2. Distribute assets and fix paths
for page in ac_pages:
    assets_dir = os.path.join("pages", page, "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # Copy standard icons
    for src_name, dest_name in icons.items():
        src_path = f"assets/icons/{src_name}"
        if not os.path.exists(src_path):
             src_path = f"assets/images/{src_name}"
        
        if os.path.exists(src_path):
            dest_path = os.path.join(assets_dir, dest_name)
            if not os.path.exists(dest_path):
                subprocess.run(["cp", src_path, dest_path])

    # Fix paths in content.html
    content_path = os.path.join("pages", page, "content.html")
    if os.path.exists(content_path):
        with open(content_path, "r", encoding="utf8") as f:
            content = f.read()
        
        # Replacement rules (Reverting global assignments to localized ones)
        # Note: We use regex-like replacement or simple string search
        content = content.replace("../../assets/icons/icon-free-estimate.webp", f"../../pages/{page}/assets/free-estimate.webp")
        content = content.replace("../../assets/images/free-estimate.webp", f"../../pages/{page}/assets/free-estimate.webp")
        
        content = content.replace("../../assets/icons/icon-free-service-call.webp", f"../../pages/{page}/assets/free-service-call.webp")
        content = content.replace("../../assets/images/free-service-call.webp", f"../../pages/{page}/assets/free-service-call.webp")
        
        content = content.replace("../../assets/icons/icon-discount.webp", f"../../pages/{page}/assets/discount-available.webp")
        content = content.replace("../../assets/images/discount-available.webp", f"../../pages/{page}/assets/discount-available.webp")
        
        content = content.replace("../../assets/icons/icon-financing.webp", f"../../pages/{page}/assets/finance-service.webp")
        content = content.replace("../../assets/images/finance-service.webp", f"../../pages/{page}/assets/finance-service.webp")
        
        content = content.replace("../../assets/icons/icon-star.webp", f"../../pages/{page}/assets/star.webp")
        content = content.replace("../../assets/images/star.webp", f"../../pages/{page}/assets/star.webp")
        
        content = content.replace("../../assets/icons/icon-call-green.webp", f"../../pages/{page}/assets/icon-call-green.webp")
        
        content = content.replace("../../assets/images/247-service.webp", f"../../pages/{page}/assets/247-service.webp")
        
        content = content.replace("../../assets/images/banner-bg.webp", f"../../pages/{page}/assets/banner-bg.webp")

        with open(content_path, "w", encoding="utf8") as f:
            f.write(content)

print("Batch fix completed.")
