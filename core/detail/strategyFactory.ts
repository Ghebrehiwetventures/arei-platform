import { DetailPlugin } from "./types";

/**
 * Strategy Factory for detail page extraction plugins
 *
 * Plugin mapping ONLY by explicit sourceId.
 */
export class StrategyFactory {
  private plugins: Map<string, DetailPlugin> = new Map();

  register(plugin: DetailPlugin): void {
    this.plugins.set(plugin.sourceId, plugin);
  }

  getPlugin(sourceId: string): DetailPlugin | null {
    return this.plugins.get(sourceId) || null;
  }

  hasPlugin(sourceId: string): boolean {
    return this.plugins.has(sourceId);
  }

  getRegisteredSources(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Singleton instance
let factoryInstance: StrategyFactory | null = null;

export function getStrategyFactory(): StrategyFactory {
  if (!factoryInstance) {
    factoryInstance = new StrategyFactory();
  }
  return factoryInstance;
}

export function resetStrategyFactory(): void {
  factoryInstance = null;
}
