import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { SourceStatus } from "./status";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  selectors: {
    listing: string;
    title: string;
    price: string;
    image: string;
  };
}

export interface SourcesConfig {
  market: string;
  sources: SourceConfig[];
}

export interface RulesConfig {
  market: string;
  rules: Record<string, unknown>;
}

export interface ConfigLoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function loadSourcesConfig(marketId: string): ConfigLoadResult<SourcesConfig> {
  const filePath = path.resolve(__dirname, `../markets/${marketId}/sources.yml`);

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `sources.yml not found at ${filePath}`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as SourcesConfig;

    if (!parsed.market) {
      return {
        success: false,
        error: "sources.yml missing required field: market",
      };
    }

    if (!Array.isArray(parsed.sources)) {
      return {
        success: false,
        error: "sources.yml missing required field: sources (array)",
      };
    }

    for (const source of parsed.sources) {
      if (!source.id || !source.url) {
        return {
          success: false,
          error: `Source missing required fields (id, url): ${JSON.stringify(source)}`,
        };
      }
    }

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse sources.yml: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function loadRulesConfig(marketId: string): ConfigLoadResult<RulesConfig> {
  const filePath = path.resolve(__dirname, `../markets/${marketId}/rules.yml`);

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `rules.yml not found at ${filePath}`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as RulesConfig;

    if (!parsed.market) {
      return {
        success: false,
        error: "rules.yml missing required field: market",
      };
    }

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse rules.yml: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
