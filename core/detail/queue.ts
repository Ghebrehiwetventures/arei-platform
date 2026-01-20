import { DetailEnrichmentInput } from "./types";

/**
 * Simple rate-limited queue for detail page fetching
 *
 * - Per-host fixed delay (3000-5000ms)
 * - No parallel requests per host
 * - FIFO ordering
 */
export class DetailQueue {
  private items: DetailEnrichmentInput[] = [];
  private lastRequestByHost: Map<string, number> = new Map();
  private minDelayMs: number;
  private maxDelayMs: number;

  constructor(minDelayMs: number = 3000, maxDelayMs: number = 5000) {
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  private getHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return "unknown";
    }
  }

  private getRandomDelay(): number {
    return this.minDelayMs + Math.random() * (this.maxDelayMs - this.minDelayMs);
  }

  enqueue(input: DetailEnrichmentInput): void {
    this.items.push(input);
  }

  enqueueAll(inputs: DetailEnrichmentInput[]): void {
    this.items.push(...inputs);
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get delay needed before processing next item
   */
  getDelayForNext(): number {
    if (this.items.length === 0) return 0;

    const host = this.getHost(this.items[0].detailUrl);
    const lastRequest = this.lastRequestByHost.get(host) || 0;
    const elapsed = Date.now() - lastRequest;
    const requiredDelay = this.getRandomDelay();

    if (elapsed >= requiredDelay) return 0;
    return Math.ceil(requiredDelay - elapsed);
  }

  /**
   * Dequeue next item and mark request time
   */
  dequeue(): DetailEnrichmentInput | undefined {
    const item = this.items.shift();
    if (item) {
      const host = this.getHost(item.detailUrl);
      this.lastRequestByHost.set(host, Date.now());
    }
    return item;
  }

  clear(): void {
    this.items = [];
    this.lastRequestByHost.clear();
  }
}
