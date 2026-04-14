export interface FetchResult {
  success: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}

export interface FetchOptions {
  headers?: Record<string, string>;
}

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": DEFAULT_USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export async function fetchHtml(url: string, opts?: FetchOptions): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  // Merge custom headers on top of defaults
  const headers = { ...DEFAULT_HEADERS, ...opts?.headers };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const html = await response.text();
    return {
      success: true,
      html,
      statusCode: response.status,
    };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return {
          success: false,
          error: "Request timeout (20s)",
        };
      }
      return {
        success: false,
        error: err.message,
      };
    }

    return {
      success: false,
      error: String(err),
    };
  }
}
