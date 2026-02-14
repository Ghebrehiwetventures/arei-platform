// Stealth: bypass Cloudflare/bot detection
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

export interface FetchResult {
  success: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}

export async function fetchHeadless(url: string): Promise<FetchResult> {
  let browser;
  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 30000,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Vänta på listings-selector (e-loop-item)
    await page.waitForSelector('.e-loop-item', { timeout: 10000 }).catch(() => {});

    // Scroll to trigger lazy-loaded images (generic pattern for many sites)
    await page.evaluate(async () => {
      const scrollStep = 400;
      const scrollDelay = 150;
      const maxScrolls = 20;

      for (let i = 0; i < maxScrolls; i++) {
        window.scrollBy(0, scrollStep);
        await new Promise(r => setTimeout(r, scrollDelay));
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) break;
      }
      // Scroll back to top
      window.scrollTo(0, 0);
    });

    // Small wait for images to load after scroll
    await new Promise(r => setTimeout(r, 500));

    const html = await page.content();

    await browser.close();

    return {
      success: true,
      html,
      statusCode: 200,
    };
  } catch (err) {
    if (browser) await browser.close();
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errorMessage,
    };
  }
}