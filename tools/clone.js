const fs = require('fs');
const https = require('https');
const path = require('path');

let html = fs.readFileSync('live_home.html', 'utf8');

const cssLinks = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);

if (!fs.existsSync('assets/css')) {
    fs.mkdirSync('assets/css', { recursive: true });
}

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(resolve); });
        }).on('error', reject);
    });
}

async function main() {
    for (let link of cssLinks) {
        let cssUrl = link.startsWith('/') ? `https://www.ezheatandair.com${link}` : link;
        let filename = path.basename(link);
        console.log(`Downloading ${cssUrl}`);
        try {
            await download(cssUrl, `assets/css/${filename}`);
            html = html.replace(link, `../../assets/css/${filename}`);
        } catch (e) {
            console.error(`Error downloading ${cssUrl}`, e);
        }
    }

    html = html.replace(/\/images\//g, '../../assets/images/');
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    fs.writeFileSync('pages/home/index.html', html);
    console.log('Finished cloning.');
}

main();
