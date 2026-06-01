import assert from "node:assert/strict";
import {
  buildListingTitle,
  isBadListingTitle,
  isAllCapsStyleTitle,
  normalizeListingDisplayTitle,
} from "./listingTitleDisplay.js";

assert.equal(
  normalizeListingDisplayTitle("LARGE BUILDING PLOT BY THE SEA ON THE ISLAND OF MAIO"),
  "Large Building Plot by the Sea on the Island of Maio",
);

assert.equal(normalizeListingDisplayTitle("THE HOUSE BY THE SEA"), "The House by the Sea");
assert.equal(normalizeListingDisplayTitle("PLOT FOR SALE IN SAL"), "Plot for Sale in Sal");

assert.equal(
  normalizeListingDisplayTitle("Santa Maria T2 with Ocean View"),
  "Santa Maria T2 with Ocean View",
);

assert.equal(normalizeListingDisplayTitle(""), "Property");
assert.equal(normalizeListingDisplayTitle(null), "Property");
assert.equal(normalizeListingDisplayTitle(undefined), "Property");

assert.equal(normalizeListingDisplayTitle("APARTMENT IN SAL, PRAIA AND SANTA MARIA"), "Apartment in Sal, Praia and Santa Maria");
assert.equal(normalizeListingDisplayTitle("AGRICULTURAL PLOTS ON THE ISLAND OF SÃO NICOLAU"), "Agricultural Plots on the Island of São Nicolau");

assert.equal(isAllCapsStyleTitle("RESIDENCE SANTA MARIA"), true);
assert.equal(isAllCapsStyleTitle("Residence Santa Maria"), false);

// ---------------------------------------------------------------------------
// buildListingTitle — English
// ---------------------------------------------------------------------------

// Full case: type + bedrooms + city + island
assert.equal(
  buildListingTitle({ title: "raw", property_type: "apartment", bedrooms: 2, city: "Santa Maria", island: "Sal" }),
  "2-Bedroom Apartment — Santa Maria, Sal",
);

// 1 bedroom (singular)
assert.equal(
  buildListingTitle({ title: "raw", property_type: "house", bedrooms: 1, city: "Praia", island: "Santiago" }),
  "1-Bedroom House — Praia, Santiago",
);

// No bedrooms — type only + location
assert.equal(
  buildListingTitle({ title: "raw", property_type: "villa", bedrooms: null, city: null, island: "Boa Vista" }),
  "Villa — Boa Vista",
);

// Studio — no bedroom prefix
assert.equal(
  buildListingTitle({ title: "raw", property_type: "studio", bedrooms: 1, city: "Mindelo", island: "São Vicente" }),
  "Studio Apartment — Mindelo, São Vicente",
);

// Land — no bedroom prefix
assert.equal(
  buildListingTitle({ title: "raw", property_type: "land", bedrooms: null, city: null, island: "Maio" }),
  "Land Plot — Maio",
);

// Commercial — no bedroom prefix
assert.equal(
  buildListingTitle({ title: "raw", property_type: "commercial", bedrooms: null, city: "Praia", island: "Santiago" }),
  "Commercial Property — Praia, Santiago",
);

// Generic 'property' type → no type label, location only
assert.equal(
  buildListingTitle({ title: "raw", property_type: "property", bedrooms: null, city: "Santa Maria", island: "Sal" }),
  "Property — Santa Maria, Sal",
);

// null type → location only
assert.equal(
  buildListingTitle({ title: "raw", property_type: null, bedrooms: null, city: "Espargos", island: "Sal" }),
  "Property — Espargos, Sal",
);

// Type only — no usable location at all → type alone
assert.equal(
  buildListingTitle({ title: "raw", property_type: "penthouse", bedrooms: 3, city: null, island: null }),
  "3-Bedroom Penthouse",
);

// city === island — no duplicate
assert.equal(
  buildListingTitle({ title: "raw", property_type: "apartment", bedrooms: 2, city: "Sal", island: "Sal" }),
  "2-Bedroom Apartment — Sal",
);

// Sentinel island stripped, city carries the location
assert.equal(
  buildListingTitle({ title: "raw", property_type: "apartment", bedrooms: 2, city: "Santa Maria", island: "__hidden_for_dedup__" }),
  "2-Bedroom Apartment — Santa Maria",
);

// Both sentinel/null — returns null (caller falls back to raw title)
assert.equal(
  buildListingTitle({ title: "raw", property_type: null, bedrooms: null, city: null, island: "__hidden_for_dedup__" }),
  null,
);

// Parenthetical sub-location stripped from island
assert.equal(
  buildListingTitle({ title: "raw", property_type: "villa", bedrooms: null, city: "Vila de Sal Rei", island: "Vila de Sal Rei (Boa Vista)" }),
  "Villa — Vila de Sal Rei, Boa Vista",
);

// ---------------------------------------------------------------------------
// buildListingTitle — Portuguese
// ---------------------------------------------------------------------------

assert.equal(
  buildListingTitle({ title: "raw", property_type: "apartment", bedrooms: 2, city: "Santa Maria", island: "Sal" }, "pt"),
  "T2 Apartamento — Santa Maria, Sal",
);

assert.equal(
  buildListingTitle({ title: "raw", property_type: "land", bedrooms: null, city: null, island: "Maio" }, "pt"),
  "Terreno — Maio",
);

assert.equal(
  buildListingTitle({ title: "raw", property_type: "studio", bedrooms: 1, city: "Mindelo", island: "São Vicente" }, "pt"),
  "Estúdio — Mindelo, São Vicente",
);

assert.equal(
  buildListingTitle({ title: "raw", property_type: "villa", bedrooms: 3, city: "Sal Rei", island: "Boa Vista" }, "pt"),
  "T3 Moradia — Sal Rei, Boa Vista",
);

// Unknown lang defaults to English
assert.equal(
  buildListingTitle({ title: "raw", property_type: "apartment", bedrooms: 1, city: "Praia", island: "Santiago" }, "fr"),
  "1-Bedroom Apartment — Praia, Santiago",
);

// ---------------------------------------------------------------------------
// isBadListingTitle — conservative bad-title detector
// ---------------------------------------------------------------------------

// --- Should be flagged as bad (deterministic title replaces these) ---

// The original bug: scraped dimensional metadata
assert.equal(
  isBadListingTitle("88.66 SqM Condo/Apartment For Sale, 2 Bedrooms located at Santa Maria, SAL, SAL"),
  true,
  "scraped SqM metadata should be flagged",
);

// Starts with numeric area
assert.equal(isBadListingTitle("120 SqM Villa For Sale"), true, "starts with numeric SqM");
assert.equal(isBadListingTitle("45.5 m² Studio"), true, "starts with numeric m²");

// SqM + located at
assert.equal(
  isBadListingTitle("Apartment 75 SqM located at Praia, Santiago"),
  true,
  "SqM + located at",
);

// SqM + for sale
assert.equal(isBadListingTitle("200 SqM House For Sale"), true, "starts with SqM (numeric)");

// "for sale … located at" boilerplate (no SqM needed)
assert.equal(
  isBadListingTitle("Property for sale located at Santa Maria, SAL, SAL"),
  true,
  "for sale located at boilerplate",
);
assert.equal(
  isBadListingTitle("Apartment for sale located at Boa Vista"),
  true,
  "for sale located at variant",
);

// Null / empty
assert.equal(isBadListingTitle(null), true, "null is bad");
assert.equal(isBadListingTitle(""), true, "empty string is bad");
assert.equal(isBadListingTitle("   "), true, "whitespace-only is bad");
assert.equal(isBadListingTitle(undefined), true, "undefined is bad");

// --- Should NOT be flagged (these titles must be preserved as-is) ---

assert.equal(isBadListingTitle("Modern Residential"), false, "generic project name");
assert.equal(isBadListingTitle("Vila Verde Resort"), false, "resort name");
assert.equal(isBadListingTitle("Praia de Chaves Villa"), false, "location + type");
assert.equal(isBadListingTitle("Beachfront Apartment"), false, "descriptive");
assert.equal(isBadListingTitle("Santa Maria Apartment"), false, "location + type");
assert.equal(
  isBadListingTitle("Investment with Profitability and Sea View: Entire Building with Active B&B"),
  false,
  "long marketing title without SqM/metadata",
);
assert.equal(
  isBadListingTitle("2 and 3-Bedroom Villas - Murdeira"),
  false,
  "has 'Bedroom' but no SqM — must be preserved",
);
assert.equal(isBadListingTitle("T3 Townhouse - Vila Verde Resort"), false, "PT bedroom notation + name");
assert.equal(isBadListingTitle("Branco 4 Holiday Apartments"), false, "development name");
assert.equal(
  isBadListingTitle("LARGE BUILDING PLOT BY THE SEA ON THE ISLAND OF MAIO"),
  false,
  "ALL-CAPS is handled by normalizer, not bad-title detector",
);

console.log("listingTitleDisplay tests passed");
