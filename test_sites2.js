const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const sites = [
  {name: 'P24 Zambia', url: 'https://www.property24.co.zm/houses-for-sale'},
  {name: 'P24 Botswana', url: 'https://www.property24.co.bw/houses-for-sale'},
  {name: 'P24 Mauritius', url: 'https://www.property24.mu/houses-for-sale'},
  {name: 'P24 Zimbabwe', url: 'https://www.property24.co.zw/houses-for-sale'},
];

(async () => {
  const browser = await puppeteerExtra.launch({headless: true, args: ['--no-sandbox']});

  for (const site of sites) {
    try {
      const page = await browser.newPage();
      const resp = await page.goto(site.url, {waitUntil: 'networkidle2', timeout: 20000});
      const html = await page.content();
      const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || 'unknown';
      const status = resp ? resp.status() : 0;
      const len = html.length;
      const blocked = title.includes('moment') || title.includes('403') || title.includes('Forbidden');
      // Check for P24 listing selectors
      const hasListings = html.includes('p24_regularTile') || html.includes('js_resultTile');
      const countMatch = html.match(/Showing \d+ - \d+ of (\d+)/);
      const total = countMatch ? countMatch[1] : '?';
      console.log(site.name + ': status=' + status + ' len=' + len + ' blocked=' + blocked + ' listings=' + hasListings + ' total=' + total + ' title="' + title.substring(0, 60) + '"');
      await page.close();
    } catch(e) {
      console.log(site.name + ': ERROR ' + (e.message || '').substring(0, 80));
    }
  }
  await browser.close();
})();
