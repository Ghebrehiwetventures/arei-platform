import { SourcePlugin } from "./types";
import { terraPlugin, simplyPlugin } from "./cv";

const plugins: Map<string, SourcePlugin> = new Map();

// Register CV market plugins
plugins.set(`cv:${terraPlugin.sourceId}`, terraPlugin);
plugins.set(`cv:${simplyPlugin.sourceId}`, simplyPlugin);

/**
 * Get a plugin by market and source ID
 */
export function getPlugin(marketId: string, sourceId: string): SourcePlugin | undefined {
  return plugins.get(`${marketId}:${sourceId}`);
}

/**
 * Get all plugins for a market
 */
export function getPluginsForMarket(marketId: string): SourcePlugin[] {
  const result: SourcePlugin[] = [];
  for (const [key, plugin] of plugins) {
    if (key.startsWith(`${marketId}:`)) {
      result.push(plugin);
    }
  }
  return result;
}

/**
 * Register a plugin
 */
export function registerPlugin(plugin: SourcePlugin): void {
  plugins.set(`${plugin.marketId}:${plugin.sourceId}`, plugin);
}
