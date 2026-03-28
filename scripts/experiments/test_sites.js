const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const sites = [
  {name: 'Lamudi TZ', url: 'https://www.lamudi.co.tz/sale/'},
  {name: 'ZoomTanzania', url: 'https://www.zoomtanzania.com/real-estate-for-sale'},
  {name: 'Lamudi UG', url: 'https://www.lamudi.co.ug/sale/'},
  {name: 'Realtor UG', url: 'https://realtor.co.ug/properties-for-sale/'},
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
      console.log(site.name + ': status=' + status + ' len=' + len + ' blocked=' + blocked + ' title="' + title.substring(0, 60) + '"');
      await page.close();
    } catch(e) {
      console.log(site.name + ': ERROR ' + (e.message || '').substring(0, 80));
    }
  }
  await browser.close();
})();
