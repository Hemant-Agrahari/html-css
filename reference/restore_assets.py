import os
import subprocess
import glob

# Configuration
ac_pages = [
    "san-diego-air-conditioner-thermostat",
    "san-diego-air-conditioner-tune-up",
    "san-diego-air-conditioning-installation",
    "san-diego-air-conditioning-repair",
    "san-diego-air-conditioner-financing",
    "san-diego-ductless-air-conditioner-repair-installation",
    "san-diego-mini-split-ac-installation",
    "san-diego-ductless-system",
    "san-diego-indoor-air-quality",
    "san-diego-air-conditioner-coil-cleaner",
    "san-diego-central-air-conditioner",
    "san-diego-duct-cleaning-services",
    "san-diego-ductless-heating",
    "san-diego-ductless-hvac",
    "san-diego-hvac-financing",
    "san-diego-hvac-package-unit",
    "san-diego-hvac-repair",
    "san-diego-hybrid-hvac-system",
    "san-diego-commercial-rooftop-hvac",
]

icons = {
    "icon-free-estimate.webp": "free-estimate.webp",
    "icon-free-service-call.webp": "free-service-call.webp",
    "icon-discount.webp": "discount-available.webp",
    "icon-financing.webp": "finance-service.webp",
    "icon-star.webp": "star.webp",
    "icon-call-green.webp": "icon-call-green.webp"
}

# 1. Distribute Icons
for page in ac_pages:
    assets_dir = os.path.join("pages", page, "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    for src_icon, dest_name in icons.items():
        src_path = os.path.join("assets/icons", src_icon)
        if not os.path.exists(src_path):
            src_path = os.path.join("assets/images", src_icon.replace("icon-", ""))
            
        if os.path.exists(src_path):
            dest_path = os.path.join(assets_dir, dest_name)
            subprocess.run(["cp", src_path, dest_path])

# 2. Download Banner (All pages use the same banner for now as identified)
banner_url = "http://ezapi.ezheatandair.com/uploads/media/EZ%20Heat-N-AIR%20CMS%20Banner%20Image.webp"
for page in ac_pages:
    assets_dir = os.path.join("pages", page, "assets")
    banner_path = os.path.join(assets_dir, "banner-bg.webp")
    subprocess.run(["curl", "-L", "-A", "Mozilla/5.0", "-o", banner_path, banner_url])

# 3. Download Unique Section Images
unique_images = {
    "san-diego-air-conditioner-thermostat": [
        ("http://ezapi.ezheatandair.com/uploads/media/vector-image.webp", "thermostat-advantage.webp"),
        ("http://ezapi.ezheatandair.com/uploads/media/vector-image.webp", "Signs-of-a-Gas-Leak.webp") # Reverting name
    ],
    "san-diego-air-conditioner-tune-up": [
        ("http://ezapi.ezheatandair.com/uploads/media/vector-image-1_11zon.webp", "Signs-of-a-Gas-Leak.webp") # Reverting name
    ],
    "san-diego-air-conditioning-installation": [
        ("http://ezapi.ezheatandair.com/uploads/media/1.webp", "Installation-1.webp"),
        ("http://ezapi.ezheatandair.com/uploads/media/2.webp", "Installation-2.webp")
    ],
    "san-diego-air-conditioning-repair": [
        ("http://ezapi.ezheatandair.com/uploads/media/01.webp", "Repair-1.webp"),
        ("http://ezapi.ezheatandair.com/uploads/media/02_11zon.webp", "Repair-2.webp")
    ]
}

for page, imgs in unique_images.items():
    assets_dir = os.path.join("pages", page, "assets")
    for url, name in imgs:
        dest_path = os.path.join(assets_dir, name)
        subprocess.run(["curl", "-L", "-A", "Mozilla/5.0", "-o", dest_path, url])

# 4. Revert HTML Paths (Regex replacement)
for page in ac_pages:
    content_path = os.path.join("pages", page, "content.html")
    if os.path.exists(content_path):
        with open(content_path, 'r') as f:
            content = f.read()
        
        # Revert Icons
        content = content.replace("../../assets/icons/icon-free-estimate.webp", f"../../pages/{page}/assets/free-estimate.webp")
        content = content.replace("../../assets/icons/icon-free-service-call.webp", f"../../pages/{page}/assets/free-service-call.webp")
        content = content.replace("../../assets/icons/icon-discount.webp", f"../../pages/{page}/assets/discount-available.webp")
        content = content.replace("../../assets/icons/icon-financing.webp", f"../../pages/{page}/assets/finance-service.webp")
        content = content.replace("../../assets/icons/icon-star.webp", f"../../pages/{page}/assets/star.webp")
        
        # Revert Banner
        content = content.replace("../../assets/images/banner-bg.webp", f"../../pages/{page}/assets/banner-bg.webp")
        
        # Unique mapping for thermostat (restore original filenames)
        if page == "san-diego-air-conditioner-thermostat":
            content = content.replace("../../assets/images/thermostat-advantage.webp", f"../../pages/{page}/assets/Signs-of-a-Gas-Leak.webp")

        with open(content_path, 'w') as f:
            f.write(content)

print("Restoration complete.")
