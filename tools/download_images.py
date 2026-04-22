import requests
import os

urls = {
    "stay-warm.jpg": "http://ezapi.ezheatandair.com/uploads/media/Stay Warm This Winter Top Heating Repair Services in San Diego CA.jpg",
    "reasons-water-heater.jpg": "https://ezapi.ezheatandair.com/uploads/media/5%20Reasons%20Your%20Water%20Heater%20Isn%C3%A2%C2%80%C2%99t%20Working%20and%20How%20San%20Diego%20Experts%20Can%20Help.jpg",
    "climate-affects.jpg": "https://ezapi.ezheatandair.com/uploads/media/How%20San%20Diego%C3%A2%C2%80%C2%99s%20Climate%20Affects%20Water%20Heater%20Performance.jpg"
}

os.makedirs("pages/home/assets", exist_ok=True)

for filename, url in urls.items():
    print(f"Downloading {filename}...")
    try:
        # Use requests to handle spaces and encoding automatically
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        with open(os.path.join("pages/home/assets", filename), "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
