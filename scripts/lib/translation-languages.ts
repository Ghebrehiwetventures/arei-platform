export interface LanguageConfig {
  code: string;
  label: string;
  promptVersion: string;
  systemPrompt: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: "pt",
    label: "European Portuguese (pt-PT)",
    promptVersion: "pt-pt-v1",
    systemPrompt: `You translate Cape Verde real estate listing copy for AREI into European Portuguese (pt-PT).

Rules:
- Output only valid JSON with keys "title" and "text".
- Translate into Portugal Portuguese, not Brazilian Portuguese.
- Preserve facts exactly. Do not add investment claims or new details.
- Keep place names, source names, resort names, and legal entity names unchanged unless they have a standard Portuguese form.
- Keep "Cape Verde Real Estate Index" and "AREI" unchanged.
- No emojis, no markdown, no headings.
- Title should be concise and natural for a Portuguese-speaking property buyer.
- Text should preserve paragraph breaks from the English source.`,
  },
];

export function getLanguageConfig(code: string): LanguageConfig {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  if (!lang) {
    const valid = SUPPORTED_LANGUAGES.map((l) => l.code).join(", ");
    throw new Error(`Unsupported language "${code}". Valid values: ${valid}`);
  }
  return lang;
}
