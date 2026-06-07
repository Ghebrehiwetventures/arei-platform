const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { resolveCvIslandRecovery } = require("../core/cvIslandRecovery");

test("resolves Cabo House Tortuga Beach Resort listings to Santa Maria, Sal", () => {
  const result = resolveCvIslandRecovery({
    id: "chp_cfc6e9876a76",
    sourceId: "cv_cabohouseproperty",
    title: "Charming Detached Villa For Sale Tortuga Beach Resort",
    description: "A villa in the prestigious Tortuga Beach Resort.",
    sourceUrl:
      "https://www.cabohouseproperty.com/properties/villa/sale/ground-first/charming-detached-villa-for-sale-tortuga-beach-resort",
    rawIsland: "Villa, Sale",
  });

  assert.deepEqual(result, {
    kind: "resolved",
    island: "Sal",
    city: "Santa Maria",
    confidence: "high",
    rule: "cabohouseproperty:tortuga_beach_resort",
    matchedText: "Tortuga Beach Resort",
  });
});

test("resolves Cabo House Porto Antigo listings to Santa Maria, Sal", () => {
  const result = resolveCvIslandRecovery({
    id: "chp_573e1b0d1937",
    sourceId: "cv_cabohouseproperty",
    title: "Porto Antigo Bright Sea View Apartment",
    description: "A bright sea-view apartment in Porto Antigo.",
    sourceUrl:
      "https://www.cabohouseproperty.com/properties/apartments/sale/ground/porto-antigo-bright-sea-view-apartment",
    rawIsland: "Sale, Ground",
  });

  assert.deepEqual(result, {
    kind: "resolved",
    island: "Sal",
    city: "Santa Maria",
    confidence: "high",
    rule: "cabohouseproperty:porto_antigo",
    matchedText: "Porto Antigo",
  });
});
