const fs = require('fs');
const path = require('path');
const dir = '/Users/ghebrehiwet/morabesa/artifacts';

const markets = ['cv', 'ke', 'gh', 'ng', 'zm'];
const results = [];

for (const m of markets) {
  const file = path.join(dir, m + '_ingest_report.json');
  if (!fs.existsSync(file)) { console.log(m + ': no report'); continue; }
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  const all = [...(r.visibleListings || []), ...(r.hiddenListings || [])];
  const total = all.length;
  const vis = r.summary.visibleCount;
  const hid = r.summary.hiddenCount;
  const hasDesc = all.filter(l => l.description && l.description.length >= 50).length;
  const hasImages = all.filter(l => (l.images || l.imageUrls || []).length >= 3).length;
  const hasBed = all.filter(l => l.bedrooms > 0).length;
  const hasBath = all.filter(l => l.bathrooms > 0).length;
  const hasPrice = all.filter(l => l.price > 0).length;
  const pct = (n) => total > 0 ? ((n/total)*100).toFixed(0) + '%' : '0%';

  results.push({
    market: m.toUpperCase(),
    total, vis, hid,
    visPct: pct(vis),
    desc: pct(hasDesc),
    imgs: pct(hasImages),
    beds: pct(hasBed),
    baths: pct(hasBath),
    price: pct(hasPrice)
  });
}

console.log('=== ALL MARKETS SUMMARY ===');
console.log('Market | Total | Vis | Hid | Vis% | Desc | Imgs | Beds | Baths | Price');
console.log('-------|-------|-----|-----|------|------|------|------|-------|------');
let totalAll = 0, visAll = 0;
for (const r of results) {
  console.log(`${r.market.padEnd(6)} | ${String(r.total).padStart(5)} | ${String(r.vis).padStart(3)} | ${String(r.hid).padStart(3)} | ${r.visPct.padStart(4)} | ${r.desc.padStart(4)} | ${r.imgs.padStart(4)} | ${r.beds.padStart(4)} | ${r.baths.padStart(5)} | ${r.price.padStart(5)}`);
  totalAll += r.total;
  visAll += r.vis;
}
console.log('-------|-------|-----|-----|------|------|------|------|-------|------');
const avgVis = totalAll > 0 ? ((visAll/totalAll)*100).toFixed(0) + '%' : '0%';
console.log(`TOTAL  | ${String(totalAll).padStart(5)} | ${String(visAll).padStart(3)} |     | ${avgVis.padStart(4)} |`);
