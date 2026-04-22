import os
import re
import requests
from bs4 import BeautifulSoup

def check_parity(page_name):
    local_path = f"pages/{page_name}/content.html"
    if not os.path.exists(local_path):
        return "Local file missing"
    
    url = f"https://www.ezheatandair.com/{page_name}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return f"Ref site error: {response.status_code}"
    except Exception as e:
        return f"Request failed: {e}"
        
    ref_soup = BeautifulSoup(response.text, 'html.parser')
    with open(local_path, 'r', encoding='utf8') as f:
        local_content = f.read()
    
    # Check H1 parity
    ref_h1 = ref_soup.find('h1')
    ref_h1_text = ref_h1.get_text(strip=True) if ref_h1 else "No H1"
    
    if ref_h1_text.lower().replace(" ", "") in local_content.lower().replace(" ", ""):
        return "H1 Matched"
    else:
        return f"H1 Mismatch: Ref='{ref_h1_text}'"

# Test on a few pages
test_pages = [
    "san-diego-air-conditioning-repair",
    "san-diego-air-conditioner-tune-up",
    "san-diego-ductless-hvac",
    "san-diego-furnace-repair",
    "san-diego-heat-pump-installation"
]

for p in test_pages:
    print(f"{p}: {check_parity(p)}")
