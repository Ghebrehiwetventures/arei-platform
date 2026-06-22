/* Canonical citation registry — single source of truth.
 *
 * Plain ESM (no TypeScript syntax) so it can be imported directly by:
 *   - the browser bundle (BlogPost.tsx imports it directly);
 *   - scripts/prerender-phase1.mjs (renders the Sources section into static HTML);
 *   - scripts/lint-blog-content.mjs (validates citations).
 *
 * blog-data.ts stores only an ordered `sourceIds` array per article (no source
 * metadata), and the Sources section is rendered from this registry at both
 * consumption points — so titles, URLs, dates and notes live in exactly one place.
 *
 * Every legal entry carries the exact primary provision (law number, official
 * gazette série/número/date, article) verified against the Boletim Oficial PDF
 * on 2026-06-19. `url` is the direct official document, never a portal homepage.
 */

export const ACCESSED = "2026-06-19";

/** @typedef {"legislation"|"government"|"official-statistics"|"official-operator"|"arei-snapshot"|"commercial"|"interview"|"secondary"} SourceType */

export const SOURCES = {
  "lei-greencard": {
    id: "lei-greencard",
    title: "Lei n.º 30/IX/2018 — estatuto diferenciado do titular de segunda residência (Green Card)",
    publisher: "Assembleia Nacional de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 23, 23 de abril de 2018, p. 539",
    articles: "arts. 3.º (limiares €80.000/€120.000, PIB per capita municipal, fallback por ilha), 6.º (isenção de IUP/IRPS), 8.º (renovação de 5 em 5 anos, e por 10 anos a partir da segunda renovação)",
    url: "https://boe.incv.cv/Bulletins/Download/2506",
    publishedAt: "2018-04-23",
    effectiveAt: "2018",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "dr-greencard": {
    id: "dr-greencard",
    title: "Decreto-Regulamentar n.º 1/2020 — Balcão Único Green Card e tramitação do pedido",
    publisher: "Conselho de Ministros de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 2, 7 de janeiro de 2020",
    articles: "art. 3.º (Casa do Cidadão designada como Balcão Único Green Card), art. 14.º (a Direção de Estrangeiros e Fronteiras decide no prazo de quinze dias a contar da receção dos documentos do art. 6.º)",
    url: "https://boe.incv.cv/Bulletins/Download/3062",
    publishedAt: "2020-01-07",
    effectiveAt: "2020",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "lei-iti": {
    id: "lei-iti",
    title: "Lei n.º 54/X/2025 — Código do Imposto sobre a Transmissão de Imóveis (ITI)",
    publisher: "Assembleia Nacional de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 46, 6 de junho de 2025",
    articles: "art. 11.º (taxa de 1%; taxa de 3% quando o alienante ou adquirente beneficiem de regime de tributação privilegiada, nos termos do Código Geral Tributário); art. 6.º, n.º 3 (mantêm-se aplicáveis os benefícios fiscais previstos em diplomas especiais); entrada em vigor a 1 de janeiro de 2026",
    url: "https://boe.incv.cv/Bulletins/Download/23602",
    publishedAt: "2025-06-06",
    effectiveAt: "2026-01-01",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "lei-ipi": {
    id: "lei-ipi",
    title: "Lei n.º 55/X/2025 — Código do Imposto sobre a Propriedade de Imóveis (IPI)",
    publisher: "Assembleia Nacional de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 46, 6 de junho de 2025",
    articles: "art. 28.º (taxa de 0,1%), art. 23.º (terrenos para construção: valor tributável = 10% do valor das edificações previstas, taxa de 0,15%), art. 24.º (agravamento de 25% para prédios urbanos devolutos/em ruínas/degradados e de 10% para fachadas exteriores principais por concluir); art. 11.º, n.º 2 do Código (mantêm-se em vigor os benefícios fiscais previstos em diplomas especiais); art. 5.º da Lei n.º 55/X/2025 (Remissões: as referências ao Regulamento do IUP passam a referir-se ao presente Código); entrada em vigor a 1 de janeiro de 2026",
    url: "https://boe.incv.cv/Bulletins/Download/23602",
    publishedAt: "2025-06-06",
    effectiveAt: "2026-01-01",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "lei-nationality": {
    id: "lei-nationality",
    title: "Lei n.º 33/X/2023 — condições de atribuição, aquisição, perda e reaquisição da nacionalidade cabo-verdiana",
    publisher: "Assembleia Nacional de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 89, 22 de agosto de 2023",
    articles: "art. 13.º, n.º 1, al. a) — a naturalização exige residir legalmente em território cabo-verdiano há pelo menos cinco anos, a par das demais condições cumulativas do art. 13.º",
    url: "https://boe.incv.cv/Bulletins/Download/4995",
    publishedAt: "2023-08-22",
    effectiveAt: "2023",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "codigo-investimento": {
    id: "codigo-investimento",
    title: "Código de Investimento (Lei n.º 13/VIII/2012, alterado pelo Decreto-Lei n.º 34/2013)",
    publisher: "República de Cabo Verde",
    gazette: "Boletim Oficial, I Série, n.º 50, 24 de setembro de 2013",
    articles: "art. 7.º (transferência de fundos para o exterior — rendimentos, dividendos e capital de investimento externo, através de instituições financeiras devidamente autorizadas, para investimento realizado com recursos do exterior devidamente registado)",
    url: "https://boe.incv.cv/Bulletins/Download/1746",
    publishedAt: "2013-09-24",
    effectiveAt: "2013",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "legislation",
    legal: true,
  },
  "dnre-nif": {
    id: "dnre-nif",
    title: "Solicitar NIF (Número de Identificação Fiscal)",
    publisher: "Direção Nacional de Receitas do Estado (DNRE), Ministério das Finanças de Cabo Verde",
    gazette: "",
    articles: "serviço oficial gratuito; passaporte aceite para o não residente; pontos de atendimento incluem Repartições de Finanças e Casa do Cidadão",
    url: "https://www.mf.gov.cv/web/dnre/solicitar-nif",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "government",
    legal: false,
  },
  "bcv-fx": {
    id: "bcv-fx",
    title: "Mercado cambial — perguntas e respostas frequentes",
    publisher: "Banco de Cabo Verde",
    gazette: "",
    articles: "o escudo está indexado ao euro à taxa fixa de 1 EUR = 110,265 CVE",
    url: "https://www.bcv.cv/en/Supervisao/Consumidores/Servi%C3%A7os%20ao%20P%C3%BAblico/perguntasrespostasfrequentes/mercadocambial/Paginas/MercadoCambial.aspx",
    accessedAt: ACCESSED,
    language: "pt",
    sourceType: "government",
    legal: false,
  },
  "arei-listings": {
    id: "arei-listings",
    title: "Cape Verde Real Estate Index — live listings",
    publisher: "AREI",
    gazette: "",
    articles: "monitored asking-price listings from tracked public sources; not transaction prices, valuations, or independently verified records",
    url: "/listings",
    accessedAt: ACCESSED,
    sourceType: "arei-snapshot",
    legal: false,
  },
  "arei-market": {
    id: "arei-market",
    title: "Cape Verde Real Estate Index — market data",
    publisher: "AREI",
    gazette: "",
    articles: "live, authoritative median asking price and tracked inventory by island; generated from current records, not frozen into prose",
    url: "/market",
    accessedAt: ACCESSED,
    sourceType: "arei-snapshot",
    legal: false,
  },
};

export const SOURCE_IDS = Object.keys(SOURCES);

const ACCESS_LABEL = "19 June 2026";

function typeLabel(t) {
  switch (t) {
    case "legislation": return "Legislation";
    case "government": return "Government";
    case "official-statistics": return "Official statistics";
    case "official-operator": return "Official operator";
    case "arei-snapshot": return "AREI dataset";
    case "commercial": return "Commercial source";
    case "interview": return "Interview";
    case "secondary": return "Secondary source";
    default: return "Source";
  }
}

/** Render one <li> for a source id (anchor target for inline #src-{id} cites). */
export function renderSourceLi(id) {
  const s = SOURCES[id];
  if (!s) return "";
  const dates = [
    s.gazette ? null : s.effectiveAt ? `effective ${s.effectiveAt}` : null,
    s.gazette ? null : s.publishedAt ? `published ${s.publishedAt}` : null,
    `accessed ${ACCESS_LABEL}`,
  ].filter(Boolean).join("; ");
  const gazette = s.gazette ? `${s.gazette}. ` : "";
  const articles = s.articles ? `${s.articles}. ` : "";
  const external = s.url.startsWith("http");
  const linkText = external ? "Official document" : "AREI";
  const link = external
    ? `<a href="${s.url}" target="_blank" rel="noopener nofollow">${linkText}</a>`
    : `<a href="${s.url}">${linkText}</a>`;
  return `<li id="src-${s.id}"><strong>${s.title}</strong> — ${s.publisher}. ${gazette}${articles}${link} (${typeLabel(s.sourceType)}; ${dates}).</li>`;
}

/** Render the Sources section from an ordered id list (no surrounding <hr>;
 *  callers place it inside the article's existing rule separators via the
 *  <!--SOURCES--> placeholder). Unknown ids are skipped; returns "" if empty. */
export function renderSourcesHtml(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return "";
  const items = ids.map(renderSourceLi).filter(Boolean).join("\n");
  if (!items) return "";
  return `<h2>Sources</h2>\n<ol class="kv-bp-sources">\n${items}\n</ol>`;
}

/** Replace the <!--SOURCES--> placeholder in article HTML with the rendered
 *  Sources section for the given ids (or remove the placeholder if none). */
export function injectSources(html, ids) {
  return String(html).replace("<!--SOURCES-->", renderSourcesHtml(ids));
}
