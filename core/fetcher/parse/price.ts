/**
 * Price text parser with multi-currency / locale-aware separator handling.
 */

import type { SourceFetchConfig } from "../types";

export function parsePrice(
  priceText: string,
  config?: SourceFetchConfig["price_format"],
): number | undefined {
  if (!priceText) return undefined;

  // CVE escudo format: "35.000.000$00" — strip the "$NN" centavo suffix before any other parsing.
  // This pattern (digits + "$" + exactly 2 digits at end of string) is unique to Cape Verdean Escudo
  // and does not conflict with USD/EUR price strings.
  const cveSuffixMatch = priceText.match(/^([\d.,\s ]+)\$\d{2}$/);
  if (cveSuffixMatch) {
    priceText = cveSuffixMatch[1].trim();
  }

  // Skip "Call for price", "POA", "negotiated", etc.
  const lower = priceText.toLowerCase();
  if (
    lower.includes("call") ||
    lower.includes("poa") ||
    lower.includes("negotiat") ||
    lower.includes("request") ||
    lower.includes("contact")
  ) {
    return undefined;
  }

  // If the selector captures surrounding text (for example title + address + price),
  // isolate the currency-bound fragment before parsing so "Porto Antigo 1 189.000€"
  // does not become 1,189,000.
  const boundedPriceMatch = priceText.match(
    /(?:€\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*€|\$\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*\$|£\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*£)/,
  );
  const candidateText = boundedPriceMatch?.[0]?.trim() || priceText;

  const currencySymbol = config?.currency_symbol || "€";
  let cleaned = candidateText
    .replace(new RegExp(currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
    .trim();

  const thousandsSep = config?.thousands_separator || ".";
  const decimalSep = config?.decimal_separator || ",";

  if (thousandsSep === ".") {
    // European format: "130.000" (period = thousands).
    // Only strip dots that look like thousands separators (3-digit groups).
    if (/^\d{1,3}\.\d{3}(\.\d{3})*/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  } else if (thousandsSep === ",") {
    cleaned = cleaned.replace(/,/g, "");
  } else if (thousandsSep === " ") {
    cleaned = cleaned.replace(/[\s ]/g, ""); // also handle non-breaking space
  }

  // Strip decimal portion BEFORE removing non-digits to avoid "38000,00" → "3800000".
  if (decimalSep === ",") {
    cleaned = cleaned.replace(/,\d{1,2}$/, "");
  } else if (decimalSep === ".") {
    cleaned = cleaned.replace(/\.\d{1,2}$/, "");
  }

  cleaned = cleaned.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);

  if (isNaN(num) || num <= 0) return undefined;

  const multiplier = config?.multiplier || 1;
  return num * multiplier;
}
