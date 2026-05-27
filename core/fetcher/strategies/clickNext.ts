/**
 * Click-next pagination strategy (Puppeteer-driven).
 *
 * Drives a headless browser through a paginated listing site by repeatedly
 * clicking a "next" button/link. Used when the site mutates the same DOM in
 * place (no URL change) or doesn't expose stable per-page URLs.
 *
 * Requires fetch_method: headless. The orchestrator enforces this and short
 * circuits with an error before delegating.
 */

import type { Browser, Page } from "puppeteer";
import { parseListingsFromHtml } from "../parse/listings";
import type {
  GenericFetchResult,
  GenericParsedListing,
  SourceFetchConfig,
} from "../types";

// Stealth: bypass Cloudflare / bot detection. The stealth plugin patches the
// shared puppeteer-extra instance, so this is only set up once per process.
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const COMMON_NEXT_SELECTORS = [
  'a[rel="next"]',
  '[aria-label="Next"]',
  '[aria-label="Next page"]',
  'a.next',
  '.pagination .next a',
  '.pagination a.next',
  '.page-numbers.next',
  '.elementor-pagination .page-numbers.next',
  '.e-pagination a.next',
  '.pagination li:last-child a',
  '.pagination a:last-of-type',
];

interface ClickPaginationResult {
  htmlPages: string[];
  debug: {
    pagesAttempted: number;
    pagesSuccessful: number;
    stopReason: string;
    errors: string[];
    detectedSelector?: string;
    autoDetectionUsed: boolean;
  };
}

/**
 * Auto-detect a working "next" selector from page by trying common
 * patterns until one matches a visible, enabled element.
 */
async function autoDetectNextSelector(page: Page): Promise<string | null> {
  for (const selector of COMMON_NEXT_SELECTORS) {
    try {
      const exists = await page.$(selector);
      if (!exists) continue;

      const isUsable = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;

        const styles = window.getComputedStyle(el);
        if (styles.display === "none" || styles.visibility === "hidden") return false;
        if ((el as HTMLElement).offsetParent === null) return false;
        if (el.hasAttribute("disabled")) return false;
        if (el.classList.contains("disabled")) return false;
        if (el.getAttribute("aria-disabled") === "true") return false;

        return true;
      }, selector);

      if (isUsable) {
        return selector;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Wait for the listing container's DOM to change using MutationObserver.
 * More reliable than polling for AJAX updates.
 */
async function waitForContentChange(
  page: Page,
  listingSelector: string,
  timeoutMs: number = 10000,
): Promise<boolean> {
  try {
    return await page.evaluate(
      (selector, timeout) => {
        return new Promise<boolean>((resolve) => {
          const container = document.querySelector(selector)?.parentElement || document.body;
          let resolved = false;

          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                if (!resolved) {
                  resolved = true;
                  observer.disconnect();
                  resolve(true);
                }
                return;
              }
              if (mutation.type === "attributes") {
                if (!resolved) {
                  resolved = true;
                  observer.disconnect();
                  resolve(true);
                }
                return;
              }
            }
          });

          observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-page"],
          });

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              resolve(false);
            }
          }, timeout);
        });
      },
      listingSelector,
      timeoutMs,
    );
  } catch {
    return false;
  }
}

/** Drive the headless browser through paginated content and capture each
 *  page's HTML. The accumulator returns the raw HTML strings; parsing is the
 *  caller's job (runClickNextStrategy below). */
async function fetchWithClickPagination(
  config: SourceFetchConfig,
): Promise<ClickPaginationResult> {
  const result: ClickPaginationResult = {
    htmlPages: [],
    debug: {
      pagesAttempted: 0,
      pagesSuccessful: 0,
      stopReason: "",
      errors: [],
      autoDetectionUsed: false,
    },
  };

  const maxPages = config.max_pages ?? 50;
  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  let nextSelector = config.pagination.next_selector;
  // click_next is HTML-only; listing selector is required here.
  const listingSelector = config.selectors.listing ?? "body";

  let browser: Browser | undefined;

  try {
    browser = (await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 30000,
    })) as Browser;

    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1280, height: 800 });

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[ClickPagination] Navigating to: ${config.base_url}`);
    }

    await page.goto(config.base_url, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForSelector(listingSelector, { timeout: 15000 }).catch(() => {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] Warning: Listing selector not found on initial load`);
      }
    });

    if (!nextSelector) {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] No next_selector configured, attempting auto-detection...`);
      }

      nextSelector = (await autoDetectNextSelector(page)) || undefined;
      result.debug.autoDetectionUsed = true;

      if (nextSelector) {
        result.debug.detectedSelector = nextSelector;
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Auto-detected next selector: ${nextSelector}`);
        }
      } else {
        result.debug.stopReason = "no_next_selector_detected";
        result.debug.errors.push(
          "Could not auto-detect next button selector. " +
            "Site may use non-standard pagination. " +
            "Configure next_selector manually or use external acquisition layer.",
        );
        // Still capture the first page so the caller has something to parse.
        result.htmlPages.push(await page.content());
        result.debug.pagesSuccessful = 1;
        return result;
      }
    }

    let pageNum = 1;
    let previousListingIds = new Set<string>();

    while (pageNum <= maxPages) {
      result.debug.pagesAttempted++;

      const html = await page.content();

      // Detect duplicate pages by listing-id overlap (more reliable than HTML diff).
      const currentListingIds = await page.$$eval(listingSelector, (els) =>
        els.map((el) => {
          const link = el.querySelector("a[href]");
          return link?.getAttribute("href") || el.textContent?.substring(0, 100) || "";
        }),
      );

      const currentSet = new Set(currentListingIds);
      const overlap = [...currentSet].filter((id) => previousListingIds.has(id)).length;

      // >80% overlap = same page rendered twice.
      if (previousListingIds.size > 0 && overlap / currentSet.size > 0.8) {
        result.debug.stopReason = "duplicate_page_content";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(
            `[ClickPagination] Page ${pageNum}: Duplicate content detected (${overlap}/${currentSet.size} overlap), stopping`,
          );
        }
        break;
      }
      previousListingIds = currentSet;

      result.htmlPages.push(html);
      result.debug.pagesSuccessful++;

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(
          `[ClickPagination] Page ${pageNum}: Captured ${html.length} bytes, ${currentSet.size} listings`,
        );
      }

      const nextButton = await page.$(nextSelector);
      if (!nextButton) {
        result.debug.stopReason = "no_next_button";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Page ${pageNum}: No next button found, stopping`);
        }
        break;
      }

      const isDisabled = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return true;
        const styles = window.getComputedStyle(el);
        if (styles.display === "none" || styles.visibility === "hidden") return true;
        if ((el as HTMLElement).offsetParent === null) return true;
        if (el.hasAttribute("disabled")) return true;
        if (el.classList.contains("disabled")) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        return false;
      }, nextSelector);

      if (isDisabled) {
        result.debug.stopReason = "next_button_disabled";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Page ${pageNum}: Next button is disabled, stopping`);
        }
        break;
      }

      const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] Waiting ${actualDelay}ms before clicking next...`);
      }
      await sleep(actualDelay);

      try {
        await nextButton.click();
      } catch (clickErr) {
        // Fallback to JS click for elements that aren't directly clickable
        // (e.g. overlays or pointer-events:none parents).
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) (el as HTMLElement).click();
        }, nextSelector);
      }

      const contentChanged = await waitForContentChange(page, listingSelector, 10000);

      if (!contentChanged) {
        // Fallback to network idle when MutationObserver doesn't fire (rare).
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] MutationObserver timeout, falling back to network idle`);
        }
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 }).catch(() => {});
      }

      await sleep(500);

      pageNum++;
    }

    if (!result.debug.stopReason) {
      result.debug.stopReason = pageNum > maxPages ? "max_pages_reached" : "natural_end";
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.debug.errors.push(errorMessage);
    result.debug.stopReason = `error: ${errorMessage}`;
    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[ClickPagination] Error: ${errorMessage}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[ClickPagination] Complete: ${result.debug.pagesSuccessful} pages captured`);
    if (result.debug.autoDetectionUsed) {
      console.log(`[ClickPagination] Auto-detected selector: ${result.debug.detectedSelector || "none"}`);
    }
  }

  return result;
}

/**
 * Top-level click_next strategy: drive the headless browser, parse each
 * captured HTML page, and return the collected listings. Mutates `debug`
 * with per-page counters and the overall stop reason from puppeteer.
 *
 * Caller must have validated fetch_method === "headless" before delegating.
 */
export async function runClickNextStrategy(
  config: SourceFetchConfig,
  processedUrls: Set<string>,
  now: Date,
  debug: GenericFetchResult["debug"],
): Promise<GenericParsedListing[]> {
  const maxItems = config.max_items ?? 200;
  const allListings: GenericParsedListing[] = [];

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] Using click_next pagination for ${config.id}`);
  }

  const clickResult = await fetchWithClickPagination(config);

  for (let i = 0; i < clickResult.htmlPages.length; i++) {
    const html = clickResult.htmlPages[i];
    debug.pagesAttempted++;
    debug.pagesSuccessful++;
    debug.htmlLengths.push(html.length);

    const pageListings = parseListingsFromHtml(html, config, processedUrls, now, debug.errors);
    debug.listingsPerPage.push(pageListings.length);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(
        `[GenericFetcher] Page ${i + 1}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`,
      );
    }

    allListings.push(...pageListings);

    if (allListings.length >= maxItems) {
      break;
    }
  }

  debug.stopReason = clickResult.debug.stopReason;
  debug.errors.push(...clickResult.debug.errors);

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] ===== Complete (click_next) =====`);
    console.log(`[GenericFetcher] Pages: ${debug.pagesSuccessful}/${debug.pagesAttempted}`);
    console.log(`[GenericFetcher] Total listings: ${allListings.length}`);
    console.log(`[GenericFetcher] Stop reason: ${debug.stopReason}`);
  }

  return allListings;
}
