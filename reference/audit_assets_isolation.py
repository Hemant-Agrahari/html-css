import os
import re

all_pages_dir = "pages"
all_pages = [p for p in os.listdir(all_pages_dir) if os.path.isdir(os.path.join(all_pages_dir, p))]

issues = []

for page in all_pages:
    html_path = os.path.join(all_pages_dir, page, "content.html")
    if not os.path.exists(html_path): continue
    
    with open(html_path, "r", encoding="utf8") as f:
        content = f.read()
    
    # Check for paths starting with ../../assets/ (global)
    # or ../../pages/ (other pages) - but exclude ../../pages/[current_page]/assets/
    
    # Regex to find all src="../../..."
    links = re.findall(r'src="(\.\./\.\./[^"]+)"', content)
    links += re.findall(r'srcset="([^"]+)"', content)
    
    for link in links:
        # Simplify srcset check: just check the first part
        rel = link.split()[0] if link.strip() else ""
        if rel.startswith("../../"):
            # Check if it points to its own assets
            own_assets_prefix = f"../../pages/{page}/assets/"
            if not rel.startswith(own_assets_prefix):
                issues.append(f"{page}: Non-isolated path detected: {rel}")

if not issues:
    print("All assets are correctly isolated!")
else:
    print(f"Found {len(issues)} isolation issues across {len(set([i.split(':')[0] for i in issues]))} pages.")
    for issue in issues[:20]: # Print first 20
        print(issue)
