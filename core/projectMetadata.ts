function compactText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return compactText(html.replace(/<[^>]+>/g, " "));
}

function normalizeSourceRef(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const cleaned = candidate
    .trim()
    .replace(/^[#:\-\s]+/, "")
    .replace(/[.,;:)\]]+$/, "")
    .slice(0, 64);

  if (!cleaned) return null;
  if (/^T\d+$/i.test(cleaned)) return null;
  if (!/[A-Za-z]/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;

  return cleaned;
}

export interface ProjectMetadataFields {
  source_ref: string | null;
  project_flag: boolean | null;
  project_start_price: number | null;
}

export interface DeriveProjectMetadataInput {
  title?: string | null;
  description?: string | null;
  price?: number | null;
  priceText?: string | null;
  html?: string | null;
  existing?: Partial<ProjectMetadataFields>;
}

export function extractSourceRefFromTexts(texts: Array<string | null | undefined>): string | null {
  const combined = compactText(texts.filter(Boolean).join(" "));
  if (!combined) return null;

  const labeledPatterns = [
    /(?:property|listing)?\s*(?:id|ref(?:erence)?|code)\s*[:#-]?\s*([A-Z]{2,10}-?\d{2,10})\b/i,
    /\bref(?:erence)?\s*[:#-]?\s*([A-Z]{2,10}-?\d{2,10})\b/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = combined.match(pattern);
    const normalized = normalizeSourceRef(match?.[1]);
    if (normalized) return normalized;
  }

  const title = compactText(texts[0]);
  const titleMatch = title.match(/\b([A-Z]{3,10}-?\d{2,10})\b/);
  return normalizeSourceRef(titleMatch?.[1]);
}

export function deriveProjectMetadata(input: DeriveProjectMetadataInput): ProjectMetadataFields {
  const title = compactText(input.title);
  const description = compactText(input.description);
  const priceText = compactText(input.priceText);
  const htmlText = htmlToText(input.html);
  const combinedText = compactText([title, priceText, description, htmlText].filter(Boolean).join(" "));

  const source_ref =
    input.existing?.source_ref ??
    extractSourceRefFromTexts([title, description, htmlText]);

  const startPriceCue =
    /(?:prices?\s+from|price\s+from|starting\s+(?:at|from)|start\s+from)\s*[€$£]?\s*\d/i.test(combinedText);

  const inferredProjectStartPrice =
    startPriceCue && input.price != null && Number.isFinite(input.price) && input.price > 0
      ? Math.round(input.price)
      : null;

  const project_start_price =
    input.existing?.project_start_price != null
      ? input.existing.project_start_price
      : inferredProjectStartPrice;

  const project_flag =
    input.existing?.project_flag != null
      ? input.existing.project_flag
      : project_start_price != null
        ? true
        : null;

  return {
    source_ref,
    project_flag,
    project_start_price,
  };
}
