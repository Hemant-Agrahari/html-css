const fs = require('fs');
const path = require('path');
const d = 'dist';
let m = 0;
fs.readdirSync(d).filter(f => f.endsWith('.html')).forEach(f => {
  const h = fs.readFileSync(path.join(d, f), 'utf-8');
  const srcs = [...h.matchAll(/src="([^"]*)"/g)].map(x => x[1]).filter(s => s.startsWith('/'));
  for (const s of srcs) {
    const fp = path.join(d, decodeURIComponent(s));
    if (!fs.existsSync(fp)) {
      console.log('MISSING:', f, s);
      m++;
    }
  }
});
console.log('Total missing:', m);
