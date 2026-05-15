import assert from "node:assert/strict";
import {
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

console.log("listingTitleDisplay tests passed");
