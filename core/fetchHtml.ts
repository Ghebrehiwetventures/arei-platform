export interface FetchResult {
  success: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}

export interface FetchOptions {
  headers?: Record<string, string>;
  retries?: number;
}

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": DEFAULT_USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5000;
const JITTER_MS = 250;
const PER_ATTEMPT_TIMEOUT_MS = 20000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  const asInt = Number(trimmed);
  if (Number.isFinite(asInt)) return Math.max(0, asInt * 1000);
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

function backoffDelay(attempt: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
  return exp + Math.floor(Math.random() * JITTER_MS);
}

async function attemptFetch(url: string, headers: Record<string, string>): Promise<{ result: FetchResult; retryAfterMs: number | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const retryAfterMs = parseRetryAfter(response.headers.get("Retry-After"));
      return {
        result: {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        },
        retryAfterMs,
      };
    }

    const html = await response.text();
    return {
      result: { success: true, html, statusCode: response.status },
      retryAfterMs: null,
    };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { result: { success: false, error: "Request timeout (20s)" }, retryAfterMs: null };
      }
      return { result: { success: false, error: err.message }, retryAfterMs: null };
    }
    return { result: { success: false, error: String(err) }, retryAfterMs: null };
  }
}

export async function fetchHtml(url: string, opts?: FetchOptions): Promise<FetchResult> {
  const headers = { ...DEFAULT_HEADERS, ...opts?.headers };
  const maxRetries = Math.max(0, opts?.retries ?? DEFAULT_RETRIES);

  let lastResult: FetchResult = { success: false, error: "no attempt made" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { result, retryAfterMs } = await attemptFetch(url, headers);
    lastResult = result;

    if (result.success) return result;

    const status = result.statusCode;
    const isRetryableStatus = status !== undefined && RETRYABLE_STATUSES.has(status);
    const isTransportError = status === undefined;
    const retryable = isRetryableStatus || isTransportError;

    if (!retryable || attempt === maxRetries) return result;

    const delay = retryAfterMs ?? backoffDelay(attempt);
    await sleep(Math.min(delay, MAX_BACKOFF_MS + JITTER_MS));
  }

  return lastResult;
}
