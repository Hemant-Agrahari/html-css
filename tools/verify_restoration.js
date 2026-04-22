const fs = require("fs");
const { chromium } = require("playwright");

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log("Navigating to local dist/index.html...");
    await page.goto("http://127.0.0.1:5500/dist/index.html", {
      waitUntil: "networkidle",
    });

    // Scroll to testimonials
    await page.evaluate(() => {
      const el =
        document.querySelector(".customer-testomial") ||
        document.querySelector(".client-slider");
      if (el) el.scrollIntoView();
    });

    await page.waitForTimeout(2000);

    const screenshotPath =
      "/home/shawn/.gemini/antigravity/brain/fe85a6e5-db46-4810-8b54-758975a1cb85/restored_ui_check.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (e) {
    console.error("Error during capture:", e);
  } finally {
    await browser.close();
  }
}

capture();
