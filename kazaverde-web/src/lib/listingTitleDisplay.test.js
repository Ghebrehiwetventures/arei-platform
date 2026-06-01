import assert from "node:assert/strict";
import {
  buildListingTitle,
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

console.log("listingTitleDisplay tests passed");
