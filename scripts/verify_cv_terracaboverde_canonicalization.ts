import { getCanonicalId } from "../core/canonicalId";
import { normalizeUrl } from "../core/normalizeUrl";

const variants = [
  "https://terracaboverde.com/properties/2-bedroom-flat-in-the-rosa-dei-venti-building",
  "https://terracaboverde.com/properties/2-bedroom-flat-in-the-rosa-dei-venti-building/",
  "https://www.terracaboverde.com/properties/2-bedroom-flat-in-the-rosa-dei-venti-building/?utm_source=test#gallery",
];

const normalized = variants.map((url) => normalizeUrl(url));
const canonicalIds = variants.map((url, index) =>
  getCanonicalId("cv_terracaboverde", url, `fallback_${index}`)
);

console.log("Normalized variants:");
for (const value of normalized) console.log(`  ${value}`);

console.log("\nCanonical IDs:");
for (const value of canonicalIds) console.log(`  ${value}`);

if (new Set(normalized).size !== 1 || new Set(canonicalIds).size !== 1) {
  console.error("\nFAIL: Terra URL variants did not collapse to one canonical identity.");
  process.exit(1);
}

console.log("\nPASS: Terra URL variants collapse to one canonical identity.");
