/**
 * Locale-aware formatting utilities for kazaverde-web.
 *
 * All functions take an explicit `locale` BCP-47 string (e.g. "en-GB", "pt-PT").
 * Derive it in React components: const locale = toLocale(i18n.language)
 */

/** Maps an i18n language code to a BCP-47 locale tag. */
export function toLocale(lang: string): string {
  return lang.startsWith("pt") ? "pt-PT" : "en-GB";
}

/**
 * Replace digit-flanked narrow/no-break spaces (PT thousands separator) with dots.
 * Only matches spaces between digits, so the non-breaking space before a currency
 * symbol (e.g. "300.000 €") is left untouched.
 */
function ptThousands(s: string, locale: string): string {
  if (!locale.startsWith("pt")) return s;
  return s.replace(/(\d)[  ](\d)/g, "$1.$2").replace(/ €/g, "€");
}

/** Plain integer or decimal: "1,234" / "1.234" */
export function formatNumber(value: number, locale: string): string {
  return ptThousands(value.toLocaleString(locale), locale);
}

/**
 * Full currency price with symbol.
 * Returns "Price on request" for null/zero — placeholder until P1 adds i18n key.
 * EN: €300,000   PT: 300.000 €
 */
export function formatPrice(
  value: number | null,
  locale: string,
  currency = "EUR",
): string {
  if (!value || value <= 0) return "Price on request";
  return ptThousands(
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value),
    locale,
  );
}

/**
 * Compact price for cards and tight UI: €300K / €1.2M  |  300K€ / 1,2M€
 * Returns "Price on request" for null/zero.
 */
export function formatCompactPrice(
  value: number | null,
  locale: string,
  currency = "EUR",
): string {
  if (!value || value <= 0) return "Price on request";
  const isPt = locale.startsWith("pt");
  const symbol = currency === "CVE" ? "CVE" : "€";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    const formatted = ptThousands(
      m.toLocaleString(locale, { maximumFractionDigits: 1 }).replace(/[,.]0$/, ""),
      locale,
    );
    return isPt ? `${formatted}M${symbol}` : `${symbol}${formatted}M`;
  }
  const formatted = ptThousands(
    value.toLocaleString(locale, { maximumFractionDigits: 0 }),
    locale,
  );
  return isPt ? `${formatted}${symbol}` : `${symbol}${formatted}`;
}

/**
 * Median price display: compact K suffix, "—" for null.
 * EN: "€180K" / "€800"   PT: "180K€" / "800€"
 */
export function formatMedian(value: number | null, locale: string): string {
  if (value === null) return "—";
  const isPt = locale.startsWith("pt");
  if (value >= 1000) {
    const k = ptThousands(Math.round(value / 1000).toLocaleString(locale), locale);
    return isPt ? `${k}K€` : `€${k}K`;
  }
  const n = ptThousands(value.toLocaleString(locale), locale);
  return isPt ? `${n}€` : `€${n}`;
}

/**
 * Price per square metre: "€2,500" / "2.500€", "—" for null.
 */
export function formatPricePerSqm(value: number | null, locale: string): string {
  if (value === null) return "—";
  const isPt = locale.startsWith("pt");
  const n = ptThousands(Math.round(value).toLocaleString(locale), locale);
  return isPt ? `${n}€` : `€${n}`;
}

/**
 * Area with unit: "79.8 m²" / "79,8 m²", "—" for null.
 */
export function formatArea(sqm: number | null, locale: string): string {
  if (sqm === null || sqm === undefined) return "—";
  return `${ptThousands(sqm.toLocaleString(locale, { maximumFractionDigits: 1 }), locale)} m²`;
}

/**
 * Full date: "18 May 2026" / "18 de mai. de 2026".
 * Pass utc=true for date-only strings (e.g. "2026-05-18") to avoid timezone drift.
 */
export function formatDate(iso: string, locale: string, utc = false): string {
  const d = utc ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}

/**
 * Short date without year: "18 May" / "18 de mai.".
 * Pass utc=true for date-only strings.
 */
export function formatShortDate(iso: string, locale: string, utc = false): string {
  const d = utc ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(utc ? { timeZone: "UTC" } : {}),
  });
}

/**
 * Relative time for listing freshness badges.
 * EN: "indexed today" / "indexed 3d ago"
 * PT: "indexado hoje" / "indexado há 3 dias"
 */
export function formatRelTime(iso: string | null | undefined, locale: string): string {
  const isPt = locale.startsWith("pt");
  if (!iso) return isPt ? "indexado recentemente" : "indexed recently";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return isPt ? "indexado recentemente" : "indexed recently";
  const days = Math.max(0, Math.round((Date.now() - ts) / 86_400_000));
  if (days === 0) return isPt ? "indexado hoje" : "indexed today";
  if (days === 1) return isPt ? "indexado há 1 dia" : "indexed 1d ago";
  return isPt ? `indexado há ${days} dias` : `indexed ${days}d ago`;
}
