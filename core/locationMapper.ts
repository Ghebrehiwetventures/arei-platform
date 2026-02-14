/**
 * Location Mapper - Config-Driven
 *
 * PoC Goal: ZERO hardcoded location logic. All location
 * mapping driven by markets/{market}/locations.yml.
 *
 * Supports both:
 * - islands[] (e.g., Cape Verde, Maldives)
 * - regions[] (e.g., Kenya, Tanzania)
 *
 * The output uses generic "region" + "city" fields that work for both.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ============================================
// TYPES (from locations.yml schema)
// ============================================

export interface CityConfig {
  name: string;
  aliases: string[];
  default?: boolean;
}

/** Generic region config - works for islands OR regions */
export interface RegionConfig {
  name: string;
  aliases: string[];
  cities: CityConfig[];
}

export interface LocationsConfig {
  market: string;
  country: string;
  currency: string;
  /** For island nations (Cape Verde, etc.) */
  islands?: RegionConfig[];
  /** For mainland countries (Kenya, etc.) */
  regions?: RegionConfig[];
  location_patterns?: string[];
}

export interface LocationResult {
  /** Generic "region" - could be island or county/state */
  island?: string;  // Keep as "island" for backward compatibility with CV
  city?: string;
  raw?: string;
}

// ============================================
// LOAD LOCATIONS CONFIG
// ============================================

const locationsCache: Map<string, LocationsConfig> = new Map();

export function loadLocationsConfig(marketId: string): LocationsConfig | null {
  if (locationsCache.has(marketId)) {
    return locationsCache.get(marketId)!;
  }

  const filePath = path.resolve(__dirname, `../markets/${marketId}/locations.yml`);

  if (!fs.existsSync(filePath)) {
    console.warn(`[LocationMapper] locations.yml not found for market: ${marketId}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const config = yaml.load(content) as LocationsConfig;
    locationsCache.set(marketId, config);
    return config;
  } catch (err) {
    console.error(`[LocationMapper] Failed to load locations.yml: ${err}`);
    return null;
  }
}

// ============================================
// PARSE LOCATION STRING → Island/City
// ============================================

export function parseLocation(locationText: string | undefined, marketId: string): LocationResult {
  if (!locationText) {
    return {};
  }

  const config = loadLocationsConfig(marketId);
  if (!config) {
    return { raw: locationText };
  }

  const textLower = locationText.toLowerCase().trim();
  const result: LocationResult = { raw: locationText };

  // Get the list of regions (islands OR regions, whichever exists)
  const allRegions: RegionConfig[] = [
    ...(config.islands || []),
    ...(config.regions || []),
  ];

  if (allRegions.length === 0) {
    return result;
  }

  // First pass: Try to match cities (more specific)
  for (const region of allRegions) {
    for (const city of region.cities) {
      for (const alias of city.aliases) {
        if (textLower.includes(alias.toLowerCase())) {
          result.island = region.name;  // "island" field used for both islands and regions
          result.city = city.name;
          return result;
        }
      }
    }
  }

  // Second pass: Try to match regions (less specific)
  for (const region of allRegions) {
    for (const alias of region.aliases) {
      if (textLower.includes(alias.toLowerCase())) {
        result.island = region.name;
        // Use default city if defined
        const defaultCity = region.cities.find(c => c.default);
        if (defaultCity) {
          result.city = defaultCity.name;
        }
        return result;
      }
    }
  }

  // Third pass: Use regex patterns from config
  if (config.location_patterns) {
    for (const patternStr of config.location_patterns) {
      const pattern = new RegExp(patternStr, "i");
      const match = locationText.match(pattern);
      if (match) {
        // Found a match, try to resolve to region
        const matchedText = match[0].toLowerCase();
        for (const region of allRegions) {
          for (const alias of region.aliases) {
            if (matchedText.includes(alias.toLowerCase()) || alias.toLowerCase().includes(matchedText)) {
              result.island = region.name;
              const defaultCity = region.cities.find(c => c.default);
              if (defaultCity) {
                result.city = defaultCity.name;
              }
              return result;
            }
          }
          // Also check city aliases
          for (const city of region.cities) {
            for (const alias of city.aliases) {
              if (matchedText.includes(alias.toLowerCase()) || alias.toLowerCase().includes(matchedText)) {
                result.island = region.name;
                result.city = city.name;
                return result;
              }
            }
          }
        }
      }
    }
  }

  return result;
}

// ============================================
// GET ALL REGIONS FOR MARKET (islands OR regions)
// ============================================

export function getIslands(marketId: string): string[] {
  const config = loadLocationsConfig(marketId);
  if (!config) return [];

  const allRegions: RegionConfig[] = [
    ...(config.islands || []),
    ...(config.regions || []),
  ];

  return allRegions.map(r => r.name);
}

/** Alias for getIslands - more semantically correct for mainland markets */
export function getRegions(marketId: string): string[] {
  return getIslands(marketId);
}

// ============================================
// GET CITIES FOR REGION (island OR region)
// ============================================

export function getCities(marketId: string, regionName: string): string[] {
  const config = loadLocationsConfig(marketId);
  if (!config) return [];

  const allRegions: RegionConfig[] = [
    ...(config.islands || []),
    ...(config.regions || []),
  ];

  const region = allRegions.find(r =>
    r.name.toLowerCase() === regionName.toLowerCase() ||
    r.aliases.some(a => a.toLowerCase() === regionName.toLowerCase())
  );

  if (!region) return [];
  return region.cities.map(c => c.name);
}

// ============================================
// GET CURRENCY FOR MARKET
// ============================================

export function getCurrency(marketId: string): string {
  const config = loadLocationsConfig(marketId);
  return config?.currency || "EUR";
}

// ============================================
// GET COUNTRY FOR MARKET
// ============================================

export function getCountry(marketId: string): string {
  const config = loadLocationsConfig(marketId);
  return config?.country || marketId.toUpperCase();
}
