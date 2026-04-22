import requests
from bs4 import BeautifulSoup
import os
from urllib.parse import urljoin, urlparse

def download_asset(url, folder):
    if not os.path.exists(folder):
        os.makedirs(folder)
    
    filename = os.path.basename(urlparse(url).path)
    if not filename:
        return
        
    local_path = os.path.join(folder, filename)
    
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            print(f"Downloaded: {filename}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

def extract_from_url(base_url, target_folder):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(base_url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract Images
        for img in soup.find_all('img'):
            img_url = img.get('src')
            if img_url:
                full_url = urljoin(base_url, img_url)
                download_asset(full_url, target_folder)
        
        # Extract SVGs (logos/icons)
        # Note: Often SVGs are inline or in CSS. This script handles linked ones.
        
    except Exception as e:
        print(f"Error processing URL: {e}")

if __name__ == "__main__":
    URL = "https://www.ezheatandair.com/san-diego-gas-line-repair-replacement"
    FOLDER = "/home/shawn/ez-plumbing-next-to-html/ezheatandair/pages/gas-line-repair-replacement/assets/extracted"
    extract_from_url(URL, FOLDER)
