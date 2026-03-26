const translationCache = new Map<string, string>();

const ITALIAN_MARKERS = [
  "appartamento",
  "descrizione",
  "residence",
  "isola",
  "spiaggia",
  "posto letto",
  "posti letto",
  "vacanze",
  "rendimenti",
  "affitti",
  "terrazza",
  "rilassarsi",
  "servizi",
  "sorveglianza",
  "opportunita",
  "investimento",
  "accogliente",
  "complesso turistico",
];

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function looksItalian(text: string): boolean {
  const sample = text.toLowerCase();
  const markerHits = ITALIAN_MARKERS.filter((marker) => sample.includes(marker)).length;
  return markerHits >= 2 || /[àèéìíîòóùú]/i.test(text);
}

function normalizeTranslationPayload(payload: unknown): string | null {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null;
  const chunks = (payload[0] as unknown[])
    .map((entry) => Array.isArray(entry) && typeof entry[0] === "string" ? entry[0] : "")
    .filter(Boolean);
  const translated = chunks.join("").replace(/\s+/g, " ").trim();
  return translated || null;
}

export async function translateItalianToEnglish(text: string): Promise<string> {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || !looksItalian(normalized)) return normalized;

  const cached = translationCache.get(normalized);
  if (cached) return cached;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "it");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", normalized);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return normalized;
    const payload = await response.json();
    const translated = normalizeTranslationPayload(payload) || normalized;
    translationCache.set(normalized, translated);
    return translated;
  } catch {
    return normalized;
  }
}
