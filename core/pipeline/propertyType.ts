// Canonical land/plot type regex — shared across pipeline and UI.
export const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;

// Unicode-aware word boundary: stops "casa" matching inside "casaco" but also
// works for accented keywords like "ático" where ASCII \b fails because
// accented letters aren't ASCII word chars. Always paired around a keyword
// alternation list. Requires the `u` flag on the resulting regex.
const L = "(?<!\\p{L})";
const R = "(?!\\p{L})";

function makeRegex(keywords: string[]): RegExp {
  return new RegExp(`${L}(?:${keywords.join("|")})${R}`, "u");
}

// Keyword lists are EN/PT/ES/FR. Order within a list is irrelevant; order of
// regex evaluation in extractPropertyType determines precedence when a title
// matches multiple categories (e.g. "penthouse villa" → villa wins).
const VILLA = makeRegex(["villa", "villas"]);
const APARTMENT = makeRegex([
  "apartment", "apartments", "flat", "flats", "apt",
  "apartamento", "apartamentos",       // PT/ES
  "piso", "pisos", "departamento",     // ES
  "appartement", "appartements",       // FR
]);
const HOUSE = makeRegex([
  "house", "houses", "home", "homes",
  "casa", "casas", "moradia", "moradias",   // PT
  "maison", "maisons",                       // FR
]);
const TOWNHOUSE = makeRegex([
  "townhouse", "townhouses", "town house",
  "geminada",                          // PT (casa geminada)
  "adosado", "adosada",                // ES
  "maison de ville",                   // FR
]);
const PENTHOUSE = makeRegex([
  "penthouse", "penthouses",
  "cobertura", "ático",                // PT/ES
  "attique",                           // FR
]);
const STUDIO = makeRegex([
  "studio", "studios", "bedsitter",
  "estúdio", "estúdios",               // PT
  "estudio", "estudios",               // ES
  "monoambiente",                      // ES
]);
const BUNGALOW = makeRegex(["bungalow", "bungalows"]);
const MAISONETTE = makeRegex(["maisonette", "maisonettes"]);
const DUPLEX = makeRegex(["duplex", "duplexes", "dúplex"]);
const LAND = makeRegex([
  "land", "lot", "lots", "plot", "plots", "acre", "acres",
  "terreno", "terrenos", "lote", "lotes",    // PT
  "parcela", "parcelas",                      // ES
  "terrain", "terrains",                      // FR
]);
const COMMERCIAL = makeRegex([
  "commercial", "office", "shop", "warehouse",
  "comercial", "escritório", "loja", "armazém",   // PT
  "oficina", "tienda", "almacén",                 // ES (NB: "oficina" can also mean "workshop")
  "bureau", "magasin", "entrepôt",                // FR
]);
const HOUSE_FALLBACK = makeRegex([
  "for sale", "for-sale", "bedroom", "bed",
  "à venda", "venda",                  // PT
  "en venta", "venta",                 // ES
  "à vendre", "vendre",                // FR
  "habitación", "quarto", "chambre",   // bedroom (ES/PT/FR)
]);

/**
 * Heuristic property-type classifier from listing title + URL.
 *
 * Keywords cover EN + PT + ES + FR — the markets the engine currently ingests
 * source content in. Unicode-aware word boundaries so accented words match
 * (ASCII \b fails on letters like "á" / "ú").
 */
export function extractPropertyType(title?: string, url?: string): string {
  const text = `${title || ""} ${url || ""}`.toLowerCase();
  const pathname = (() => {
    try {
      return url ? new URL(url).pathname.toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  if (/\/(?:lands?|plots?|lots?)(?:\/|$)/.test(pathname)) return "land";
  if (/\/(?:offices?|commercial)(?:\/|$)/.test(pathname)) return "commercial";

  if (VILLA.test(text)) return "villa";
  if (APARTMENT.test(text)) return "apartment";
  if (TOWNHOUSE.test(text)) return "townhouse";
  if (PENTHOUSE.test(text)) return "penthouse";
  if (STUDIO.test(text)) return "studio";
  if (BUNGALOW.test(text)) return "bungalow";
  if (MAISONETTE.test(text)) return "maisonette";
  if (DUPLEX.test(text)) return "duplex";
  if (HOUSE.test(text)) return "house";
  if (LAND.test(text)) return "land";
  if (COMMERCIAL.test(text)) return "commercial";

  if (HOUSE_FALLBACK.test(text)) return "house";

  return "property";
}
