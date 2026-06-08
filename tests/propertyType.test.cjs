const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const {
  extractPropertyType,
  normalizeBedroomsForPropertyType,
  LAND_TYPES,
} = require("../core/pipeline/propertyType");

// ── English baseline ────────────────────────────────────────────────────────

test("extractPropertyType: villa (EN)", () => {
  assert.equal(extractPropertyType("Luxury Villa with Pool"), "villa");
});

test("extractPropertyType: apartment (EN)", () => {
  assert.equal(extractPropertyType("2-Bedroom Apartment in Praia"), "apartment");
});

test("extractPropertyType: studio beats apartment in mixed titles", () => {
  assert.equal(extractPropertyType("Studio Apartment for Sale"), "studio");
});

test("normalizeBedroomsForPropertyType: studios use the established zero-bedroom contract", () => {
  assert.equal(normalizeBedroomsForPropertyType("studio", null), 0);
  assert.equal(normalizeBedroomsForPropertyType("apartment", null), null);
  assert.equal(normalizeBedroomsForPropertyType("studio", 1), 1);
});

test("extractPropertyType: townhouse (EN, with space) — beats house keyword", () => {
  assert.equal(extractPropertyType("Modern Town House for Sale"), "townhouse");
});

test("extractPropertyType: land (EN)", () => {
  assert.equal(extractPropertyType("Building Plot 500m2"), "land");
});

test("extractPropertyType: plural lots (EN)", () => {
  const propertyType = extractPropertyType(
    "Lots in new subdivision - Ilha do Sal - Murdeira",
    "https://www.ccoreinvestments.com/en/property-detail/sal-murdeira/750773"
  );

  assert.equal(propertyType, "land");
  assert.equal(LAND_TYPES.test(propertyType), true);
});

test("extractPropertyType: explicit development opportunity resolves to land", () => {
  assert.equal(
    extractPropertyType("Fabulous Development Opportunity - Prime Cape Verde Property"),
    "land",
  );
});

test("extractPropertyType: EstateCV lands URL overrides generic property title", () => {
  assert.equal(
    extractPropertyType(
      "PROPERTY MEANT FOR AN EXTENSIVE DEVELOPMENT PROJECT",
      "https://estatecv.com/en/properties/lands/development-project",
    ),
    "land",
  );
});

test("extractPropertyType: EstateCV offices URL resolves to commercial", () => {
  assert.equal(
    extractPropertyType(
      "DuarGema Fitness",
      "https://estatecv.com/en/properties/offices/fitness-duargema",
    ),
    "commercial",
  );
});

// ── Portuguese ──────────────────────────────────────────────────────────────

test("extractPropertyType: PT apartamento", () => {
  assert.equal(extractPropertyType("Apartamento T2 no centro"), "apartment");
});

test("extractPropertyType: PT moradia", () => {
  assert.equal(extractPropertyType("Moradia V4 com piscina"), "house");
});

test("extractPropertyType: PT terreno (via LAND keyword)", () => {
  assert.equal(extractPropertyType("Terreno para construção"), "land");
});

test("extractPropertyType: PT cobertura → penthouse", () => {
  assert.equal(extractPropertyType("Cobertura duplex vista mar"), "penthouse");
});

// ── Spanish ─────────────────────────────────────────────────────────────────

test("extractPropertyType: ES piso → apartment", () => {
  assert.equal(extractPropertyType("Piso de 3 dormitorios en Madrid"), "apartment");
});

test("extractPropertyType: ES adosado → townhouse", () => {
  assert.equal(extractPropertyType("Chalet adosado en urbanización"), "townhouse");
});

test("extractPropertyType: ES ático (accented) → penthouse", () => {
  assert.equal(extractPropertyType("Ático con terraza"), "penthouse");
});

// ── French ──────────────────────────────────────────────────────────────────

test("extractPropertyType: FR appartement", () => {
  assert.equal(extractPropertyType("Appartement T3 lumineux"), "apartment");
});

test("extractPropertyType: FR maison", () => {
  assert.equal(extractPropertyType("Maison avec jardin"), "house");
});

test("extractPropertyType: FR maison de ville → townhouse (beats maison)", () => {
  assert.equal(extractPropertyType("Belle maison de ville rénovée"), "townhouse");
});

// ── Boundary safety ─────────────────────────────────────────────────────────

test("extractPropertyType: 'casaco' (PT for 'coat') does NOT match casa", () => {
  // No house keywords present; should fall through to 'property'
  assert.equal(extractPropertyType("Casaco de inverno"), "property");
});

test("extractPropertyType: returns 'property' when nothing matches", () => {
  assert.equal(extractPropertyType("Reference 12345"), "property");
});

// ── LAND_TYPES already had PT/FR — confirm unchanged ────────────────────────

test("LAND_TYPES still matches existing PT/FR keywords", () => {
  assert.ok(LAND_TYPES.test("terreno"));
  assert.ok(LAND_TYPES.test("lote"));
  assert.ok(LAND_TYPES.test("parcela"));
  assert.ok(LAND_TYPES.test("terrain"));
});
