import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatMedian, formatNumber, toLocale } from "../lib/formatters";
import { PRICE_BUCKETS, type PriceBucket, type MarketOverview } from "arei-sdk";
import "./Detail.css";
import "./Market.css";

const BUCKET_LABEL: Record<PriceBucket, string> = {
  under_100k: "Under €100K",
  "100k_250k": "€100K – €250K",
  "250k_500k": "€250K – €500K",
  over_500k: "Over €500K",
};
const BUCKET_LABEL_PT: Record<PriceBucket, string> = {
  under_100k: "Abaixo de €100K",
  "100k_250k": "€100K – €250K",
  "250k_500k": "€250K – €500K",
  over_500k: "Acima de €500K",
};
const BUCKET_ORDER: PriceBucket[] = ["under_100k", "100k_250k", "250k_500k", "over_500k"];

const MARKET_FAQ_SCRIPT_ID = "kv-jsonld-market-faq";

const MARKET_FAQ = [
  {
    topic: "Coverage",
    q: "What does the Cape Verde Real Estate Index track?",
    a: "It tracks public property listings from monitored sources across Cape Verde. The page summarises asking prices, inventory, island distribution, and how many listings have a readable public price.",
  },
  {
    topic: "Prices",
    q: "Are these asking prices or completed sale prices?",
    a: "Asking prices only — taken directly from each public listing. The Cape Verde Real Estate Index does not claim transaction values, bank valuations, or official registry data.",
  },
  {
    topic: "Method",
    q: "How is the median asking price calculated?",
    a: "The median is the middle value in a sorted list of public asking prices for a given island. Only EUR-denominated listings within a price range of €10,000–€5,000,000 are included. Islands with fewer than 5 priced listings show no median.",
  },
  {
    topic: "Method",
    q: "Why are some listings excluded from price figures?",
    a: "Listings with no public price, a price-on-request note, or a price outside the €10,000–€5,000,000 window are excluded from the price sample. They still count toward total inventory.",
  },
  {
    topic: "Coverage",
    q: "What does 'in price sample' mean?",
    a: "The price sample is the subset of tracked listings that have a readable EUR asking price within the €10,000–€5,000,000 window. Medians and price-band figures are drawn from this sample only.",
  },
  {
    topic: "Freshness",
    q: "How often is the data updated?",
    a: "Tracked sources are checked daily. New listings, price changes, and removals appear as each source refreshes.",
  },
  {
    topic: "Samples",
    q: "Why do some islands show inventory but no median price?",
    a: "Some islands have too few priced listings for a useful median. In those cases the index shows inventory only and withholds the median rather than publishing a figure based on a very small sample.",
  },
  {
    topic: "Limits",
    q: "Can I use this data to value a specific property?",
    a: "No. This is a market overview, not valuation advice. A specific property depends on location, condition, title, view, building quality, costs, and local due diligence.",
  },
  {
    topic: "Quality",
    q: "Does the index remove duplicate listings?",
    a: "The index removes or groups duplicate records where source data provides enough matching signals. Some duplicates may remain when agents publish the same property with different descriptions or prices.",
  },
];

const MARKET_FAQ_PT = [
  {
    topic: "Cobertura",
    q: "O que acompanha o Cape Verde Real Estate Index?",
    a: "Acompanha anúncios públicos de imóveis de fontes monitorizadas em Cabo Verde. A página resume preços pedidos, inventário, distribuição por ilha e quantos anúncios têm preço público legível.",
  },
  {
    topic: "Preços",
    q: "São preços pedidos ou preços de vendas concluídas?",
    a: "Apenas preços pedidos — retirados diretamente de cada anúncio público. O Cape Verde Real Estate Index não afirma representar valores de transação, avaliações bancárias ou dados de registo oficial.",
  },
  {
    topic: "Método",
    q: "Como se calcula o preço mediano pedido?",
    a: "A mediana é o valor central de uma lista ordenada de preços pedidos públicos para uma dada ilha. Apenas anúncios denominados em EUR entre €10.000 e €5.000.000 são incluídos. Ilhas com menos de 5 anúncios com preço não mostram mediana.",
  },
  {
    topic: "Método",
    q: "Porque estão alguns anúncios excluídos das figuras de preço?",
    a: "Anúncios sem preço público, com preço sob consulta ou fora do intervalo €10.000–€5.000.000 são excluídos da amostra de preços. Continuam a contar para o inventário total.",
  },
  {
    topic: "Cobertura",
    q: "O que significa 'na amostra de preços'?",
    a: "A amostra de preços é o subconjunto de anúncios acompanhados com preço pedido em EUR legível entre €10.000 e €5.000.000. Medianas e distribuições de faixas de preço baseiam-se apenas nesta amostra.",
  },
  {
    topic: "Atualização",
    q: "Com que frequência são atualizados os dados?",
    a: "As fontes acompanhadas são verificadas diariamente. Novos anúncios, alterações de preço e remoções aparecem à medida que cada fonte é atualizada.",
  },
  {
    topic: "Amostras",
    q: "Porque algumas ilhas mostram inventário mas não preço mediano?",
    a: "Algumas ilhas têm poucos anúncios com preço para uma mediana útil. Nesses casos o índice mostra apenas o inventário e retém a mediana.",
  },
  {
    topic: "Limites",
    q: "Posso usar estes dados para avaliar um imóvel específico?",
    a: "Não. Isto é uma visão geral do mercado, não aconselhamento de avaliação. Um imóvel específico depende de localização, estado, título, vista, qualidade de construção, custos e due diligence local.",
  },
  {
    topic: "Qualidade",
    q: "O índice remove anúncios duplicados?",
    a: "O índice remove ou agrupa registos duplicados quando os dados de origem fornecem sinais de correspondência suficientes. Alguns duplicados podem permanecer quando agentes publicam o mesmo imóvel com descrições ou preços diferentes.",
  },
];

/* SVG area chart — used for the inventory trend (coming-soon) section. */
function InventoryChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return null;
  const W = 600, H = 200, PX = 44, PY = 24;
  const maxVal = Math.max(...points.map((p) => p.value));
  const minVal = Math.min(...points.map((p) => p.value)) * 0.85;
  const range = maxVal - minVal || 1;
  const xs = points.map((_, i) => PX + (i / (points.length - 1)) * (W - PX * 2));
  const ys = points.map((p) => PY + (1 - (p.value - minVal) / range) * (H - PY * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${H - PY} L${xs[0]},${H - PY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="kv-m-chart" role="img" aria-label="Inventory trend chart">
      <defs>
        <linearGradient id="kv-m-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--kv-green)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--kv-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kv-m-chart-fill)" />
      <path d={line} fill="none" stroke="var(--kv-green-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="3.5" fill="var(--kv-green-deep)" />
          <text x={x} y={H - 4} textAnchor="middle" fontSize="10" fontFamily="var(--kv-mono)" fill="var(--kv-gray-500)">{points[i].label}</text>
          <text x={x} y={ys[i] - 10} textAnchor="middle" fontSize="11" fontWeight="600" fontFamily="var(--kv-mono)" fill="var(--kv-black)">{points[i].value}</text>
        </g>
      ))}
    </svg>
  );
}

/* Interactive Mapbox GL JS map centred on Cape Verde + West Africa coast.
   Dynamically imported so mapbox-gl doesn't inflate the initial bundle. */
function CapeVerdeMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = (import.meta.env.VITE_MAPBOX_TOKEN ?? "").trim();
    if (!token || !containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    import("mapbox-gl").then((module) => {
      import("mapbox-gl/dist/mapbox-gl.css");
      const mapboxgl = module.default;
      mapboxgl.accessToken = token;

      const el = containerRef.current;
      if (!el) return;

      map = new mapboxgl.Map({
        container: el,
        style: "mapbox://styles/mapbox/light-v11",
        bounds: [[-28, 12], [-10, 22]],
        fitBoundsOptions: { padding: 20 },
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }));
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
    });

    return () => { map?.remove(); };
  }, []);

  const token = (import.meta.env.VITE_MAPBOX_TOKEN ?? "").trim();

  return (
    <div className="kv-m-geo-wrap">
      <div className="kv-m-geo-map">
        {token ? (
          <div ref={containerRef} className="kv-m-geo-mapbox" />
        ) : (
          <div className="kv-m-geo-fallback">
            <div className="kv-m-geo-fallback-pin">📍</div>
            <div className="kv-m-geo-fallback-label">Cape Verde</div>
            <div className="kv-m-geo-fallback-sub">Atlantic · Off West Africa</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Market() {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const locale = toLocale(i18n.language);
  const marketFaq = isPt ? MARKET_FAQ_PT : MARKET_FAQ;

  useDocumentMeta(t("market.metaTitle"), t("market.metaDescription"));

  const [openIdx, setOpenIdx] = useState(0);
  const [data, setData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* FAQ JSON-LD — injected once data is available */
  useEffect(() => {
    if (loading || error || !data) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://capeverderealestateindex.com/market#faq",
      mainEntity: marketFaq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    };
    const script =
      (document.getElementById(MARKET_FAQ_SCRIPT_ID) as HTMLScriptElement | null) ??
      document.createElement("script");
    script.id = MARKET_FAQ_SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    if (!script.parentNode) document.head.appendChild(script);
    return () => { document.getElementById(MARKET_FAQ_SCRIPT_ID)?.remove(); };
  }, [loading, error, data, marketFaq]);

  useEffect(() => {
    let cancelled = false;
    arei.getMarketOverview()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load market data.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="kv-m-state">
        <p>{isPt ? "A carregar dados de mercado…" : "Loading market data…"}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="kv-m-state kv-m-state-error">
        <h1>{isPt ? "Dados de mercado indisponíveis" : "Market data unavailable"}</h1>
        <p>{error ?? t("common.liveDataUnavailable")}</p>
      </div>
    );
  }

  const priceSamplePct = data.totalListings > 0
    ? Math.round((data.priceSampleCount / data.totalListings) * 100)
    : 0;
  const maxBucket = Math.max(...data.buckets.map((b) => b.count), 1);
  const maxCount = Math.max(...data.islands.filter((i) => i.totalListings > 0).map((i) => i.totalListings), 1);
  const bucketLabels = isPt ? BUCKET_LABEL_PT : BUCKET_LABEL;

  return (
    <div className="kv-m">

      {/* Hero */}
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{isPt ? "Visão geral do mercado" : "Market overview"}</div>
          <h1>{isPt ? "O mercado imobiliário de Cabo Verde." : "The Cape Verde property market."}</h1>
          <p className="kv-hero-sub">
            {isPt
              ? `Baseado em ${formatNumber(data.totalListings, locale)} anúncios públicos acompanhados em ${data.islandCount} ilhas. Atualizado diariamente após a conclusão dos crawlers.`
              : `Based on ${formatNumber(data.totalListings, locale)} tracked public listings across ${data.islandCount} islands. Updated daily as crawlers complete.`}
          </p>
        </div>
      </header>

      {/* Geographic context */}
      <section className="kv-m-geo">
        <div className="kv-m-inner">
          <div className="kv-m-section-head" style={{ marginBottom: 20 }}>
            <span className="kv-l-eyebrow">{isPt ? "Onde fica Cabo Verde?" : "Where is Cape Verde?"}</span>
            <h2>{isPt ? "Um arquipélago ao largo da África Ocidental." : "An archipelago off West Africa."}</h2>
          </div>
          <div className="kv-m-geo-grid">
            <CapeVerdeMap />
            <div className="kv-m-geo-facts">
              {[
                [isPt ? "População" : "Population", "~600,000"],
                [isPt ? "Independência" : "Independence", isPt ? "1975 (de Portugal)" : "1975 (from Portugal)"],
                [isPt ? "Capital" : "Capital", "Praia, Santiago"],
                [isPt ? "Ilhas" : "Islands", isPt ? "10 (9 habitadas)" : "10 (9 inhabited)"],
                [isPt ? "Ilhas principais" : "Main islands", "Sal · Boa Vista · Santiago"],
                [isPt ? "Língua oficial" : "Official language", isPt ? "Português" : "Portuguese"],
                [isPt ? "Língua falada" : "Spoken language", "Kriolu"],
                [isPt ? "Moeda" : "Currency", isPt ? "CVE · preços em EUR" : "CVE · prices in EUR"],
              ].map(([k, v]) => (
                <div className="kv-m-geo-fact" key={k}>
                  <span className="kv-m-geo-fact-k">{k}</span>
                  <span className="kv-m-geo-fact-v">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Intro narrative */}
      <section className="kv-m-intro">
        <div className="kv-m-inner">
          <div className="kv-m-intro-grid">
            <div className="kv-m-intro-lead">
              <p>
                {isPt
                  ? "O mercado imobiliário de Cabo Verde está disperso por múltiplos agentes e portais, sem registo central de anúncios. Um índice com fontes atribuídas é a forma mais clara de ver preços pedidos, concentração de oferta e variações ao longo do tempo."
                  : "Cape Verde's property market is spread across multiple agents and portals, with no central listings registry. A source-attributed index is the clearest way to see asking prices, supply concentration, and changes over time."}
              </p>
              <p>
                {isPt
                  ? "Esta página é a leitura pública desse índice. É construída a partir de anúncios acompanhados em fontes de agentes e portais, atualizada diariamente. Publicamos o que os anúncios mostram e nunca tratamos preço pedido como transação."
                  : "This page is the public read of that index. It is built from tracked listings on agent and portal sources, refreshed daily. We publish what listings show and never represent asking price as a completed sale."}
              </p>
            </div>
            <div className="kv-m-intro-meta">
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">{isPt ? "Atualização" : "Refresh"}</span>
                <span className="kv-m-intro-meta-v">{isPt ? "Diária, automática" : "Daily, automated"}</span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">{isPt ? "Amostra" : "Sample"}</span>
                <span className="kv-m-intro-meta-v">
                  {formatNumber(data.totalListings, locale)} {isPt ? "anúncios" : "listings"} · {data.islandCount} {isPt ? "ilhas" : "islands"}
                </span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">{isPt ? "Método" : "Method"}</span>
                <span className="kv-m-intro-meta-v"><a href="#methodology">{isPt ? "Ver abaixo ↓" : "See below ↓"}</a></span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">{isPt ? "Usar para" : "Use for"}</span>
                <span className="kv-m-intro-meta-v">{isPt ? "Benchmarks de preço, não transações" : "Pricing benchmarks, not transactions"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-l-mmi-strip">
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{isPt ? "Total de anúncios" : "Total listings"}</div>
              <div className="kv-l-mmi-num">{formatNumber(data.totalListings, locale)}</div>
              <div className="kv-l-mmi-delta">
                {isPt ? `Acompanhados em ${data.islandCount} ilhas` : `Tracked across ${data.islandCount} islands`}
              </div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{isPt ? "Na amostra de preços" : "In price sample"}</div>
              <div className="kv-l-mmi-num">{priceSamplePct}%</div>
              <div className="kv-l-mmi-delta">
                {isPt
                  ? `${formatNumber(data.priceSampleCount, locale)} de ${formatNumber(data.totalListings, locale)} têm preço pedido público`
                  : `${formatNumber(data.priceSampleCount, locale)} of ${formatNumber(data.totalListings, locale)} have a public asking price`}
              </div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{isPt ? "Adicionados este mês" : "Added this month"}</div>
              <div className="kv-l-mmi-num">{formatNumber(data.addedThisMonth, locale)}</div>
              <div className="kv-l-mmi-delta">{isPt ? "Vistos pela primeira vez desde dia 1" : "First seen since the 1st"}</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{isPt ? "Fontes ativas" : "Active sources"}</div>
              <div className="kv-l-mmi-num">{data.sourceCount}</div>
              <div className="kv-l-mmi-delta">{isPt ? "Portais e agências acompanhados" : "Tracked portals and agencies"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Price distribution */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{isPt ? "Distribuição de preços" : "Price distribution"}</span>
            <h2>{isPt ? "Onde se concentra o inventário." : "Where the inventory sits."}</h2>
            <p>
              {isPt
                ? "Anúncios com preço pedido em EUR agrupados em quatro faixas de preço."
                : "Listings with a public EUR asking price grouped into four price bands."}
            </p>
          </div>
          <div className="kv-m-bars">
            {data.buckets.map((b) => (
              <div className="kv-m-bar-row" key={b.key}>
                <div className="kv-m-bar-label">{bucketLabels[b.key]}</div>
                <div className="kv-m-bar-track" aria-hidden="true">
                  <div className="kv-m-bar-fill" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                </div>
                <div className="kv-m-bar-val">{b.count}</div>
              </div>
            ))}
          </div>
          <p className="kv-m-disclaimer">
            {isPt
              ? `Com base em ${formatNumber(data.priceSampleCount, locale)} anúncios com preço pedido público em EUR entre €10.000 e €5.000.000.`
              : `Based on ${formatNumber(data.priceSampleCount, locale)} listings with a public EUR asking price between €10,000 and €5,000,000.`}
          </p>
        </div>
      </section>

      {/* Median asking price by island */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{isPt ? "Por ilha" : "By island"}</span>
            <h2>{isPt ? "Preço mediano pedido por ilha." : "Median asking price by island."}</h2>
            <p>
              {isPt
                ? "Mediana do preço pedido para cada ilha com dados de preço disponíveis. Mínimo de 5 anúncios com preço por ilha; ilhas abaixo do limiar mostram apenas inventário."
                : "Asking-price median for each island with available price data. Minimum 5 priced listings per island; islands below the threshold show inventory only."}
            </p>
          </div>
          <div className="kv-m-island-table">
            <div className="kv-m-island-h">
              <span>{isPt ? "Ilha" : "Island"}</span>
              <span>{isPt ? "Anúncios" : "Listings"}</span>
              <span>{isPt ? "Na amostra" : "In sample"}</span>
              <span>{isPt ? "Preço mediano pedido" : "Median asking price"}</span>
            </div>
            {data.islands.map((island) => (
              <div className="kv-m-island-row" key={island.island}>
                <span className="kv-m-island-name">{island.island}</span>
                <span className="kv-m-island-count">{formatNumber(island.totalListings, locale)}</span>
                <span className="kv-m-island-count">{formatNumber(island.priceSampleCount, locale)}</span>
                <span className="kv-m-island-median">
                  {island.medianAskingPrice !== null ? formatMedian(island.medianAskingPrice, locale) : "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="kv-m-disclaimer">
            {isPt
              ? "Com base em anúncios com preço pedido público. Mínimo de 5 anúncios por ilha."
              : "Based on listings with a public asking price. Minimum 5 listings per island."}
          </p>
        </div>
      </section>

      {/* Listings by island */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{isPt ? "Distribuição" : "Distribution"}</span>
            <h2>{isPt ? "Anúncios por ilha." : "Listings by island."}</h2>
            <p>
              {isPt
                ? "Quota do inventário acompanhado por ilha — mostra onde a oferta se concentra."
                : "Share of tracked inventory per island — shows where supply concentrates."}
            </p>
          </div>
          <div className="kv-m-bars">
            {data.islands
              .filter((i) => i.totalListings > 0)
              .map((island) => (
                <div className="kv-m-bar-row" key={island.island}>
                  <div className="kv-m-bar-label">{island.island}</div>
                  <div className="kv-m-bar-track" aria-hidden="true">
                    <div className="kv-m-bar-fill" style={{ width: `${(island.totalListings / maxCount) * 100}%` }} />
                  </div>
                  <div className="kv-m-bar-val">{island.totalListings}</div>
                </div>
              ))}
          </div>
          <p className="kv-m-disclaimer">
            {isPt ? "Com base em anúncios públicos acompanhados." : "Based on tracked public listings."}
          </p>
        </div>
      </section>

      {/* Inventory trend — coming soon */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{isPt ? "Tendência · Em breve" : "Trend · Coming soon"}</span>
            <h2>{isPt ? "Inventário ao longo do tempo." : "Inventory over time."}</h2>
            <p>
              {isPt
                ? "Os dados históricos estão a ser recolhidos. O gráfico será preenchido à medida que os snapshots se acumularem."
                : "Historical data is accumulating. The chart will fill as snapshots build up over time."}
            </p>
          </div>
          <div className="kv-coming">
            <div className="kv-coming-content" aria-hidden="true">
              <InventoryChart points={[]} />
            </div>
            <div className="kv-coming-overlay">
              <span className="kv-pill">{isPt ? "Em breve" : "Coming soon"}</span>
              <p>{isPt ? "Recolha de dados históricos em curso" : "Historical data collection in progress"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology / FAQ accordion */}
      <section className="kv-m-section" id="methodology">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{isPt ? "Metodologia" : "Methodology"}</span>
            <h2>{isPt ? "Como ler estes dados." : "How to read this data."}</h2>
            <p>
              {isPt
                ? "Respostas curtas sobre o que o índice mede, onde estão os limites e como interpretar os números."
                : "Short answers on what the index measures, where the limits are, and how to read the numbers."}
            </p>
          </div>
          <div className="kv-m-faq" id="faq">
            {marketFaq.map((item, i) => {
              const isOpen = openIdx === i;
              return (
                <div className={`kv-m-faq-row${isOpen ? " is-open" : ""}`} key={item.q}>
                  <button
                    type="button"
                    className="kv-m-faq-q"
                    onClick={() => setOpenIdx(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="kv-m-faq-topic">{item.topic}</span>
                    <span className="kv-m-faq-text">{item.q}</span>
                    <span className="kv-m-faq-icon" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </button>
                  <div className="kv-m-faq-a" aria-hidden={!isOpen}>{item.a}</div>
                </div>
              );
            })}
          </div>
          <p className="kv-m-disclaimer">
            {isPt
              ? "Todos os dados são baseados em anúncios públicos acompanhados. Não constitui aconselhamento jurídico, financeiro ou de avaliação."
              : "All data is based on tracked public listings. This is not legal, financial, or valuation advice."}
          </p>
          <p className="kv-m-disclaimer">
            <Link to="/about">
              {isPt
                ? "Ler mais sobre o Cape Verde Real Estate Index."
                : "Read more about the Cape Verde Real Estate Index."}
            </Link>
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
