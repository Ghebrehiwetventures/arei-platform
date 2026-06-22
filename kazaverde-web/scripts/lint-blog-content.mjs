/* Factual-content lint + citation/registry validation for the published guides.
 *
 * Wired into `npm test`. Guards the regressions corrected in the factual audit
 * (docs/blog-factual-audit-2026-06-19.md) and enforces the single-source-of-truth
 * citation architecture. It scans the PUBLISHED article bodies, titles, and
 * descriptions, the FAQ entries that feed the FAQ JSON-LD, and the Portuguese
 * mirrors, and validates every citation against the canonical registry
 * (src/lib/sources.data.mjs).
 *
 * The offline article (cape-verde-rental-yields-realistic) is hidden via
 * OFFLINE_SLUGS and is NOT scanned for prose — but a guard fails the build if it
 * is ever removed from the offline set or leaks into the published list before
 * passing its own factual audit.
 *
 * Allowed annotations for a numeric assertion (on the same HTML block):
 *   class="kv-cite" | href="#src-... | <!-- factual:hypothetical|snapshot|cited -->
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES, SOURCE_IDS, renderSourcesHtml, injectSources } from "../src/lib/sources.data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const blogDataPath = path.join(root, "src/lib/blog-data.ts");
const faqDataPath = path.join(root, "src/lib/faq-data.ts");
const blogListPath = path.join(root, "src/pages/BlogList.tsx");
const blogPostPath = path.join(root, "src/pages/BlogPost.tsx");

const OFFLINE_SLUG = "cape-verde-rental-yields-realistic";

/* Known bad / risky phrases — hard fail anywhere in published English content. */
const HARD_BLOCK = [
  { re: /does ?n['’]?t need to be renewed/i, label: "Green Card renewal denial" },
  { re: /does not need to be renewed/i, label: "Green Card renewal denial" },
  { re: /no renewal required/i, label: "Green Card renewal denial" },
  { re: /Ministry of Tourism and Transport/i, label: "Green Card filed at Ministry of Tourism (wrong office)" },
  { re: /0\.15% (for|on) land\b/i, label: "IPI 0.15% mislabelled as general land rate" },
  { re: /domestic flights only/i, label: "São Vicente 'domestic flights only'" },
  { re: /birthplace of morna/i, label: "'birthplace of morna'" },
  { re: /no restrictions on (the )?repatriation/i, label: "'no restrictions on repatriation'" },
  { re: /same rights as citizens/i, label: "foreign-ownership equality claim" },
  { re: /no restrictions on nationality/i, label: "'no restrictions on nationality'" },
  { re: /verified (data|listing|listings)/i, label: "'verified data/listing'" },
  { re: /verified data badges?/i, label: "'verified data badges'" },
  { re: /guaranteed (return|returns|yield|yields)/i, label: "'guaranteed return/yield'" },
  { re: /cash transactions dominate/i, label: "'cash transactions dominate'" },
  { re: /majority of foreign buyers (pay cash|bring their own)/i, label: "'majority of foreign buyers pay cash'" },
  { re: /most foreign owners live abroad/i, label: "'most foreign owners live abroad'" },
  { re: /(is|are) the standard in reputable developments/i, label: "'bank guarantees are standard'" },
  { re: /there is no licensing requirement/i, label: "'no property-management licensing'" },
  { re: /no standardized property management licensing/i, label: "'no property-management licensing'" },
  { re: /most liquid property market/i, label: "'most liquid' market claim" },
  { re: /delays?[^.]{0,40}(normally|typically|usually)[^.]{0,20}6-12 months/i, label: "'construction delays normally 6-12 months'" },
  { re: /6-12 months beyond the stated completion/i, label: "'6-12 months beyond completion'" },
  { re: /1,248,052/, label: "INE 2025 figure (primary publication not obtained — must be removed)" },
  { re: /kazaverde\.com/i, label: "stale kazaverde.com link" },
  { re: /africarealestateindex\.com/i, label: "africarealestateindex.com link in guide body" },
  { re: /\/market-data\b/i, label: "stale /market-data link" },
];

/* Prohibited commercial numbers (audit section I). Fail unless annotated. */
const NUMERIC_WATCH = [
  { re: /10-15%/, label: "10-15% appreciation" },
  { re: /5-8%/, label: "5-8% gross yield" },
  { re: /3-5%\s*(net|for|range)/i, label: "3-5% net yield" },
  { re: /7-12%/, label: "7-12% yield" },
  { re: /15-25%/, label: "15-25% cheaper" },
  { re: /15-30%/, label: "15-30% cheaper" },
  { re: /25-35%/, label: "25-35% management fee" },
  { re: /6-9%/, label: "6-9% mortgage rate" },
  { re: /60-70%/, label: "60-70% LTV" },
  { re: /50-70%/, label: "50-70% LTV" },
  { re: /20-25 years/i, label: "20-25 year mortgage term" },
  { re: /4-12 weeks/i, label: "4-12 week financing timeline" },
  { re: /4-8 weeks/i, label: "4-8 week purchase timeline" },
  { re: /6-12 weeks/i, label: "6-12 week purchase timeline" },
  { re: /€\s?500-1,?500/, label: "€500-1,500 lawyer fee" },
  { re: /€\s?420\b/, label: "€420 notary fee" },
  { re: /€\s?200-300\b/, label: "€200-300 registry fee" },
  { re: /€\s?3,?000\b/, label: "€3,000 deposit" },
  { re: /€\s?50-150\b/, label: "€50-150 monthly management cost" },
  { re: /€\s?600-2,?000\b/, label: "€600-2,000 condominium charge" },
  { re: /15-35% of gross/i, label: "15-35% management fee range" },
];

const ANNOTATION = /(class="kv-cite"|href="#src-|<!--\s*factual:(hypothetical|snapshot|cited)\s*-->)/;
const norm = (s) => s.replace(/[–—]/g, "-");

async function loadModule(filePath, replacements, exportName) {
  let source = await readFile(filePath, "utf8");
  for (const [from, to] of replacements) source = source.replace(from, to);
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(`${source}\nexport { ${exportName} };`)}`;
  return (await import(url))[exportName];
}

function pushAll(errors, fn) {
  try { fn(); } catch (e) { errors.push(`[lint-internal] ${e.message}`); }
}

async function main() {
  const errors = [];
  const blogText = await readFile(blogDataPath, "utf8");

  const articles = await loadModule(
    blogDataPath,
    [
      [/export interface BlogArticle[\s\S]*?\n}\n\n/, ""],
      [/export const BLOG_ARTICLES: BlogArticle\[] =/, "const BLOG_ARTICLES ="],
      [/\nexport function getArticleBySlug[\s\S]*$/, "\n"],
    ],
    "BLOG_ARTICLES",
  );
  const faq = await loadModule(
    faqDataPath,
    [
      [/export interface FaqEntry[\s\S]*?\n}\n\n/, ""],
      [/export const FAQ_ENTRIES: FaqEntry\[] =/, "const FAQ_ENTRIES ="],
    ],
    "FAQ_ENTRIES",
  );

  // ── Source-level OG meta guard ────────────────────────────────────────────
  // og:article:* is not a valid OG namespace; correct properties are article:* (no og: prefix).
  const prerenderSrc = await readFile(path.join(root, "scripts/prerender-phase1.mjs"), "utf8");
  const hookSrc = await readFile(path.join(root, "src/hooks/useDocumentMeta.ts"), "utf8");
  if (/"og:article:(published|modified)_time"/.test(prerenderSrc)) errors.push('[meta] prerender-phase1.mjs sets og:article:published_time or og:article:modified_time — use article:* (without og: prefix)');
  if (/"og:article:(published|modified)_time"/.test(hookSrc)) errors.push('[meta] useDocumentMeta.ts sets og:article:published_time or og:article:modified_time — use article:* (without og: prefix)');

  // ── Registry integrity + claim-level legal locators ───────────────────────
  const VAGUE_LOCATOR = /\b(transitional|conditions|see law|nationality conditions|remiss[õo]es)\b/i;
  const EXACT_ARTICLE = /arts?\.\s*\d|artigos?\s*\d/i;
  for (const [key, s] of Object.entries(SOURCES)) {
    if (s.id !== key) errors.push(`[registry] entry "${key}" has mismatched id "${s.id}"`);
    if (s.legal) {
      if (!s.gazette) errors.push(`[registry] legal source "${key}" missing gazette reference`);
      if (!s.articles) errors.push(`[registry] legal source "${key}" missing article reference`);
      // A legal source must cite the direct official document, not a homepage/portal root.
      if (!/boe\.incv\.cv\/Bulletins\/Download\//.test(s.url)) {
        errors.push(`[registry] legal source "${key}" url is not a direct gazette document (placeholder?): ${s.url}`);
      }
      // Every legal source must carry an EXACT claim-level locator (art. N),
      // and any vague term must be paired with an exact article.
      if (!EXACT_ARTICLE.test(s.articles || "")) {
        errors.push(`[locator] legal source "${key}" lacks an exact article locator (art. N)`);
      }
      if (VAGUE_LOCATOR.test(s.articles || "") && !EXACT_ARTICLE.test(s.articles || "")) {
        errors.push(`[locator] legal source "${key}" uses a vague locator without an exact provision`);
      }
    }
  }
  const idCounts = {};
  for (const id of SOURCE_IDS) idCounts[id] = (idCounts[id] || 0) + 1;
  for (const [id, n] of Object.entries(idCounts)) if (n > 1) errors.push(`[registry] duplicate source id "${id}"`);

  const REQUIRED_DISCLOSURE = "Based on monitored asking-price listings. Not transaction prices or valuations.";

  function scanText(where, text, { numeric }) {
    const n = norm(text);
    for (const { re, label } of HARD_BLOCK) if (re.test(n)) errors.push(`[blocklist] ${where}: ${label}`);
    if (!numeric) return;
    for (const line of n.split("\n")) {
      if (ANNOTATION.test(line)) continue;
      for (const { re, label } of NUMERIC_WATCH) {
        if (re.test(line)) errors.push(`[numeric] ${where}: unsourced "${label}" → ${line.trim().slice(0, 110)}`);
      }
    }
  }

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  for (const a of articles) {
    scanText(`${a.slug} (title)`, a.title, { numeric: false });
    scanText(`${a.slug} (description)`, a.description, { numeric: false });
    scanText(`${a.slug} (body)`, a.content, { numeric: true });

    // dateModified must be article-owned: present, ISO, and >= publishedAt.
    if (!a.modifiedAt) errors.push(`[modifiedAt] ${a.slug}: missing modifiedAt`);
    else {
      if (!ISO_DATE.test(a.modifiedAt)) errors.push(`[modifiedAt] ${a.slug}: modifiedAt "${a.modifiedAt}" is not ISO YYYY-MM-DD`);
      if (ISO_DATE.test(a.date) && a.modifiedAt < a.date) {
        errors.push(`[modifiedAt] ${a.slug}: modifiedAt ${a.modifiedAt} precedes publishedAt ${a.date}`);
      }
    }

    const declared = new Set(a.sourceIds || []);
    const cited = new Set([...a.content.matchAll(/href="#src-([a-z0-9-]+)"/g)].map((m) => m[1]));

    // Every declared source id must exist in the registry.
    for (const id of declared) {
      if (!SOURCE_IDS.includes(id)) errors.push(`[citation] ${a.slug}: declared sourceId "${id}" not in registry`);
    }
    // Every inline citation must be a registry id AND declared in sourceIds.
    for (const id of cited) {
      if (!SOURCE_IDS.includes(id)) errors.push(`[citation] ${a.slug}: inline #src-${id} not in registry`);
      if (!declared.has(id)) errors.push(`[citation] ${a.slug}: inline #src-${id} not declared in sourceIds`);
    }
    // No orphan declared source (every declared id must be cited inline).
    for (const id of declared) {
      if (!cited.has(id)) errors.push(`[citation] ${a.slug}: declared source "${id}" is never cited inline (orphan)`);
    }
    // The rendered Sources section must resolve every inline anchor.
    const rendered = injectSources(a.content, a.sourceIds);
    for (const id of cited) {
      if (!rendered.includes(`id="src-${id}"`)) {
        errors.push(`[citation] ${a.slug}: inline #src-${id} has no rendered Sources anchor`);
      }
    }
  }

  // Market-data guide must carry the exact disclosure.
  const prices = articles.find((a) => a.slug === "cape-verde-property-prices-by-island");
  if (prices && !prices.content.includes(REQUIRED_DISCLOSURE)) {
    errors.push("[disclosure] prices-by-island missing required disclosure sentence");
  }

  for (const f of faq) scanText(`FAQ "${f.question}"`, `${f.question} ${f.answer}`, { numeric: false });

  // ── Offline-article guard ───────────────────────────────────────────────────
  pushAll(errors, () => {
    const offlineMatch = blogText.match(/const OFFLINE_SLUGS = new Set\(\[([^\]]*)\]\)/);
    const offlineSet = offlineMatch ? offlineMatch[1] : "";
    if (!offlineSet.includes(`"${OFFLINE_SLUG}"`)) {
      errors.push(`[offline] ${OFFLINE_SLUG} is no longer in OFFLINE_SLUGS — it must pass its own factual audit before republishing`);
    }
    if (articles.some((a) => a.slug === OFFLINE_SLUG)) {
      errors.push(`[offline] ${OFFLINE_SLUG} leaked into the published BLOG_ARTICLES`);
    }
  });

  // Offline route must carry an X-Robots-Tag noindex header and have no inbound links.
  const vercelText = await readFile(path.join(root, "vercel.json"), "utf8");
  const offlineHeaderRe = new RegExp(`"source":\\s*"/blog/${OFFLINE_SLUG}"[\\s\\S]{0,160}?X-Robots-Tag[\\s\\S]{0,40}?noindex`, "i");
  if (!offlineHeaderRe.test(vercelText)) {
    errors.push(`[offline] vercel.json lacks an X-Robots-Tag noindex header for /blog/${OFFLINE_SLUG}`);
  }
  for (const a of articles) {
    if (a.content.includes(`/blog/${OFFLINE_SLUG}`)) errors.push(`[offline] published guide ${a.slug} links to the offline slug`);
  }

  // ── EN + PT sweep on the page files (incl. decimal-comma variants) ──────────
  const PT_BLOCK = [
    { re: /não impõe restrições ao repatriamento/i, label: "PT 'no restrictions on repatriation'" },
    { re: /mesmos direitos dos cidadãos/i, label: "PT 'same rights as citizens'" },
    { re: /residência permanente a estrangeiros/i, label: "PT 'permanent residency' Green Card claim" },
    { re: /Compras a pronto dominam/i, label: "PT 'cash purchases dominate'" },
    { re: /0,15% (para|de) (todos os )?terrenos\b/i, label: "PT '0,15% for all land'" },
    { re: /berço da morna/i, label: "PT 'birthplace of morna'" },
    { re: /Medianas de preços pedidos e contagens/i, label: "PT frozen median/count claim" },
  ];
  for (const p of [blogListPath, blogPostPath]) {
    const text = await readFile(p, "utf8");
    for (const { re, label } of PT_BLOCK) if (re.test(text)) errors.push(`[pt-blocklist] ${path.basename(p)}: ${label}`);
  }

  if (errors.length > 0) {
    console.error(`\n✗ Factual-content lint failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error("");
    process.exit(1);
  }
  const totalCites = articles.reduce((sum, a) => sum + (a.sourceIds?.length || 0), 0);
  console.log(
    `✓ Factual-content lint passed — ${articles.length} published guides + ${faq.length} FAQ entries scanned; ` +
      `${totalCites} citations across ${SOURCE_IDS.length} canonical sources; offline article guarded.`,
  );
}

main().catch((err) => {
  console.error("[lint-blog-content] crashed:", err);
  process.exit(1);
});
