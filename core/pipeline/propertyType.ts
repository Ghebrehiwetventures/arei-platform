// Canonical land/plot type regex — shared across pipeline and UI.
export const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;

/**
 * Heuristic property-type classifier from listing title + URL.
 *
 * Note: English keywords only — known limitation tracked in
 * docs/operations/generic-pipeline-refactor-plan.md §2.7. Adding locale-aware
 * keyword lists is Phase D2.
 */
export function extractPropertyType(title?: string, url?: string): string {
  const text = `${title || ""} ${url || ""}`.toLowerCase();

  if (/\b(villa|villas)\b/.test(text)) return "villa";
  if (/\b(apartment|apartments|flat|flats|apt)\b/.test(text)) return "apartment";
  if (/\b(house|houses|home|homes)\b/.test(text)) return "house";
  if (/\b(townhouse|townhouses|town house)\b/.test(text)) return "townhouse";
  if (/\b(penthouse|penthouses)\b/.test(text)) return "penthouse";
  if (/\b(studio|studios|bedsitter)\b/.test(text)) return "studio";
  if (/\b(bungalow|bungalows)\b/.test(text)) return "bungalow";
  if (/\b(maisonette|maisonettes)\b/.test(text)) return "maisonette";
  if (/\b(duplex|duplexes)\b/.test(text)) return "duplex";
  if (/\b(land|plot|plots|acre|acres)\b/.test(text)) return "land";
  if (/\b(commercial|office|shop|warehouse)\b/.test(text)) return "commercial";

  if (/\b(for.?sale|bedroom|bed)\b/.test(text)) return "house";

  return "property";
}
