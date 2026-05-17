/*
 * Phase 1 — static, manually curated in code.
 * Phase 2 — move to Supabase. Intended table: `market_news`
 *
 * Column mapping (snake_case DB → camelCase TS):
 *   id              → id              (text, primary key)
 *   title           → title           (text)         English editorial headline
 *   original_title  → originalTitle   (text, nullable) original publisher title
 *   source_name     → sourceName      (text)
 *   source_url      → sourceUrl       (text)
 *   published_at    → publishedAt     (date)
 *   added_at        → addedAt         (date)
 *   category        → category        (text, FK or enum)
 *   snippet         → snippet         (text)
 *   why_it_matters  → whyItMatters    (text, nullable)
 *   relevance       → relevance       ("high" | "standard", default "standard")
 *   status          → (not in Phase 1) "published" | "hidden" | "archived" | "candidate"
 *
 * Phase 2 public query:
 *   supabase.from("market_news").select("*").eq("status", "published")
 *
 * Phase 2 admin workflow:
 *   RSS/manual discovery → status = "candidate"
 *   Admin edits title, snippet, why_it_matters, original_title
 *   Admin sets status = "published" to make item public
 *
 * MARKET_NEWS_CATEGORIES stays static (UI filter config, not DB-driven).
 * Replace useMarketNews() hook body only — MarketNews.tsx does not change.
 */

export type MarketNewsCategory =
  | "Economy"
  | "Tourism"
  | "Hospitality"
  | "Infrastructure"
  | "Aviation"
  | "Foreign investment"
  | "Policy / regulation"
  | "Tax / residency"
  | "Construction"
  | "Banking / credit"
  | "Currency / macro risk";

export type MarketNewsItem = {
  id: string;
  title: string;
  originalTitle?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  category: MarketNewsCategory;
  snippet: string;
  whyItMatters?: string;
  signalTags?: string[];
  affectedRegions?: string[];
  addedAt: string;
  relevance: "high" | "standard";
};

export const MARKET_NEWS_CATEGORIES: MarketNewsCategory[] = [
  "Economy",
  "Tourism",
  "Hospitality",
  "Infrastructure",
  "Aviation",
  "Foreign investment",
  "Policy / regulation",
  "Tax / residency",
  "Construction",
  "Banking / credit",
  "Currency / macro risk",
];

export const MARKET_NEWS_ITEMS: MarketNewsItem[] = [
  {
    id: "cva-praia-providence-recife-2026-05-06",
    title: "Cape Verde Airlines expands international routes with new Praia–Providence and Praia–Recife services",
    originalTitle: "Cabo Verde Airlines expande rota internacional com novos voos Praia-Providence e Praia-Recife",
    sourceName: "Governo de Cabo Verde",
    sourceUrl:
      "https://www.governo.cv/cabo-verde-airlines-expande-rota-internacional-com-novos-voos-praia-providence-e-praia-recife/",
    publishedAt: "2026-05-06",
    category: "Aviation",
    snippet:
      "Cabo Verde Airlines added weekly Praia-Providence and Praia-Recife services, restoring direct links with the United States and Brazil from the capital.",
    whyItMatters:
      "Direct airlift affects tourism flows, diaspora access, investor visits and the relative appeal of Santiago as a connected property market.",
    addedAt: "2026-05-12",
    relevance: "high",
  },
  {
    id: "unemployment-low-2026-04-28",
    title: "Cape Verde records lowest-ever unemployment rate, Prime Minister cites historic result",
    originalTitle: "Cabo Verde atinge taxa de desemprego mais baixa de sempre: Primeiro-Ministro realça resultado histórico",
    sourceName: "Governo de Cabo Verde",
    sourceUrl:
      "https://www.governo.cv/cabo-verde-atinge-taxa-de-desemprego-mais-baixa-de-sempre-primeiro-ministro-realca-resultado-historico/",
    publishedAt: "2026-04-28",
    category: "Economy",
    snippet:
      "Government communications cite a 4.9% unemployment rate for the second half of 2025 and more than 14,000 jobs created over one year.",
    whyItMatters:
      "Employment and household income shape local housing demand, mortgage capacity and the resilience of domestic rental markets.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "swissport-cabo-verde-handling-2026-04-28",
    title: "Government formalises privatisation of Cape Verde Handling to Swissport",
    originalTitle: "Governo formaliza privatização da Cabo Verde Handling com a Swissport",
    sourceName: "Governo de Cabo Verde",
    sourceUrl:
      "https://www.governo.cv/governo-formaliza-privatizacao-da-cabo-verde-handling-com-a-swissport/",
    publishedAt: "2026-04-28",
    category: "Foreign investment",
    snippet:
      "The government formalized the sale of a majority stake in Cabo Verde Handling to Swissport, alongside a planned investment program for airport services.",
    whyItMatters:
      "Ground-handling capacity is part of the air-connectivity stack that supports tourism growth and confidence in the airport concession model.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "administrative-procedure-code-2026-04-24",
    title: "New Administrative Procedure Code published in the Official Gazette",
    originalTitle: "Publicação do Novo Código do Processo Administrativo no Boletim Oficial",
    sourceName: "Governo de Cabo Verde",
    sourceUrl:
      "https://www.governo.cv/publicacao-do-novo-codigo-do-processo-administrativo-no-boletim-oficial/",
    publishedAt: "2026-04-24",
    category: "Policy / regulation",
    snippet:
      "Cape Verde published a new Administrative Procedure Code that is scheduled to enter into force in January 2027.",
    whyItMatters:
      "Clearer administrative procedures can matter for permits, disputes, public decisions and the wider confidence investors place in state processes.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "marriott-four-points-sao-vicente-2026-03-30",
    title: "Marriott International Makes its Entry into Cape Verde with the Opening of Four Points by Sheraton São Vicente Resort",
    sourceName: "Marriott International",
    sourceUrl:
      "https://marriott.pressarea.com/en/news/marriott-international-makes-its-entry-into-cape-verde-with-the-opening-of-four-points-by-sheraton-so-vicente-resort/30032026",
    publishedAt: "2026-03-30",
    category: "Hospitality",
    snippet:
      "Marriott announced its Cape Verde debut with Four Points by Sheraton Sao Vicente Resort above Laginha Beach in Mindelo.",
    whyItMatters:
      "International hotel brands can change destination visibility, support conference demand and strengthen the investment case beyond Sal and Boa Vista.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "agua-hotels-sal-2026-03-03",
    title: "Água Hotels commits EUR 12 million to new tourist-apartment project on Sal",
    originalTitle: "Água Hotels investe 12 milhões de euros em novo projecto na Ilha do Sal",
    sourceName: "Diário Imobiliário",
    sourceUrl:
      "https://diarioimobiliario.pt/Agua-Hotels-investe-12-milhoes-de-euros-em-novo-projecto-na-Ilha-do-Sal",
    publishedAt: "2026-03-03",
    category: "Construction",
    snippet:
      "Agua Hotels presented a planned four-star tourist-apartment project in Santa Maria, Sal, with an estimated investment of EUR 12 million.",
    whyItMatters:
      "Hotel-apartment supply is directly adjacent to the holiday-home market and can influence rental expectations, local jobs and construction demand.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "brookings-blue-economy-2026-02-17",
    title: "Harnessing the blue economy for growth and prosperity: The Cabo Verde experience",
    sourceName: "Brookings",
    sourceUrl:
      "https://www.brookings.edu/articles/harnessing-the-blue-economy-for-growth-and-prosperity-the-cabo-verde-experience/",
    publishedAt: "2026-02-17",
    category: "Tourism",
    snippet:
      "A policy commentary frames Cabo Verde's ocean economy around tourism, maritime transport, renewable energy, digital links and climate resilience.",
    whyItMatters:
      "The long-term property story depends on whether tourism is complemented by logistics, energy and services that broaden demand across islands.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "housing-credit-bonification-2026-02-12",
    title: "Cape Verde Treasury details subsidised housing-credit scheme for home buyers",
    originalTitle: "Bonificação de Crédito de Habitação",
    sourceName: "Ministério das Finanças",
    sourceUrl: "https://www.mf.gov.cv/web/dgt/bonifica%C3%A7%C3%A3o",
    publishedAt: "2026-02-12",
    category: "Banking / credit",
    snippet:
      "The Treasury's housing-credit support page details subsidized mortgage-interest regimes, including young-buyer and general access tracks.",
    whyItMatters:
      "Credit subsidies can affect local buyer affordability, especially for permanent housing, construction and renovation activity.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "imf-article-iv-2026-02-07",
    title: "IMF Executive Board Concludes the 2025 Article IV Consultation, Seventh Review under the Extended Credit Facility Arrangement, and Third Review under the Resilience and Sustainability Facility Arrangement with Cabo Verde",
    sourceName: "International Monetary Fund",
    sourceUrl:
      "https://www.imf.org/en/news/articles/2026/02/07/pr26036-cabo-verde-imf-concl-2025-aiv-consultation-7th-rev-under-ecf-and-3rd-rev-under-rsf",
    publishedAt: "2026-02-07",
    category: "Currency / macro risk",
    snippet:
      "The IMF highlighted strong tourism-led activity, stable inflation, reserves above program targets and continuing risks from external shocks and state-owned enterprises.",
    whyItMatters:
      "Macro stability, debt risk and external reserves shape confidence in the CVE peg, financing conditions and the risk premium buyers attach to the market.",
    addedAt: "2026-05-12",
    relevance: "high",
  },
  {
    id: "property-tax-reform-2026-01-07",
    title: "Cape Verde property tax reform: new IPI and ITI codes enter into force",
    originalTitle: "Cabo Verde - Reforma da Tributação do Património: Novos Códigos Fiscais entram em vigor",
    sourceName: "PwC Portugal",
    sourceUrl:
      "https://www.pwc.pt/pt/pwcinforfisco/flash/cabo-verde/reforma-tributacao-patrimonio-novos-codigos-fiscais.html",
    publishedAt: "2026-01-07",
    category: "Tax / residency",
    snippet:
      "PwC summarizes the new IPI and ITI property-tax codes that entered into force on 1 January 2026, replacing the prior IUP framework.",
    whyItMatters:
      "Transfer tax, annual property tax and valuation mechanics change buyer costs, holding costs and transaction structuring for Cape Verde property.",
    addedAt: "2026-05-12",
    relevance: "high",
  },
  {
    id: "santiago-pumped-storage-2025-12-12",
    title: "Cabo Verde on the path to energy sustainability",
    sourceName: "LuxDev",
    sourceUrl: "https://luxdev.lu/en/news/cabo-verde-path-energy-sustainability",
    publishedAt: "2025-12-12",
    category: "Infrastructure",
    snippet:
      "LuxDev describes the Santiago pumped-storage project, including energy storage, desalination support and EUR 79 million of planned investment.",
    whyItMatters:
      "Reliable electricity and water infrastructure are practical constraints on housing, hospitality and investor confidence outside pure resort zones.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
  {
    id: "tourism-budget-2026-2025-11-21",
    title: "Tourism named strategic development sector in Cape Verde's 2026 budget",
    originalTitle: "Turismo é setor estratégico e catalisador do desenvolvimento de Cabo Verde - Olavo Correia",
    sourceName: "Governo de Cabo Verde",
    sourceUrl:
      "https://www.governo.cv/turismo-e-setor-estrategico-e-catalisador-do-desenvolvimento-de-cabo-verde-olavo-correia/",
    publishedAt: "2025-11-21",
    category: "Tourism",
    snippet:
      "The government presented tourism as a central development sector in the 2026 budget discussion, with funding aimed at tourism and connectivity.",
    whyItMatters:
      "Tourism policy and connectivity spending are core inputs for rental demand, employment and island-level property liquidity.",
    addedAt: "2026-05-12",
    relevance: "standard",
  },
];
