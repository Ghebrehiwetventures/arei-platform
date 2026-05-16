import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import { FAQ_ENTRIES, type FaqEntry } from "../lib/faq-data";
import NewsletterCta from "../components/NewsletterCta";
import "./BlogList.css";

function fmtDate(iso: string, locale = "en-GB"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function categoryFor(tags: string[]): "buying" | "market" | "legal" | "tax" {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((x) => x.includes("legal"))) return "legal";
  if (t.some((x) => x.includes("tax"))) return "tax";
  if (t.some((x) => x.includes("market") || x.includes("yield"))) return "market";
  return "buying";
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function categoryLabelPt(cat: string): string {
  const labels: Record<string, string> = {
    buying: "Compra",
    market: "Mercado",
    legal: "Legal",
    tax: "Fiscal",
  };
  return labels[cat] ?? cat;
}

const ARTICLE_PT: Record<string, { title: string; description: string }> = {
  "cape-verde-property-prices-by-island": {
    title: "Preços de imóveis em Cabo Verde por ilha: o que o Cape Verde Real Estate Index mostra atualmente",
    description:
      "Medianas de preços pedidos e contagens de anúncios por ilha, retiradas do Cape Verde Real Estate Index. Um retrato do inventário público anunciado em Cabo Verde, não do mercado completo.",
  },
  "buying-property-cape-verde-guide": {
    title: "Como comprar imóvel em Cabo Verde: guia passo a passo para compradores estrangeiros",
    description:
      "Cabo Verde permite que estrangeiros comprem imóveis em propriedade plena, sem restrições de nacionalidade. O enquadramento legal assenta no direito português.",
  },
  "which-cape-verde-island-property": {
    title: "Em que ilha de Cabo Verde deve comprar imóvel? Uma comparação baseada em dados",
    description:
      "As dez ilhas de Cabo Verde têm perfis, infraestruturas e mercados imobiliários distintos. Escolher a ilha certa é uma das decisões mais importantes.",
  },
  "cape-verde-property-tax-reform-2026": {
    title: "Reforma fiscal imobiliária de Cabo Verde em 2026: o que mudou e o que significa para compradores",
    description:
      "Em 1 de janeiro de 2026, Cabo Verde implementou a reforma fiscal imobiliária mais significativa em mais de 25 anos.",
  },
  "cape-verde-rental-yields-realistic": {
    title: "Rentabilidades de arrendamento em Cabo Verde: o que esperar realisticamente em 2026",
    description:
      "As promessas de rentabilidade em Cabo Verde variam entre conservadoras e demasiado otimistas. Antes de comprar para investimento, é importante perceber os fatores reais.",
  },
  "cape-verde-green-card-residency": {
    title: "Green Card de Cabo Verde: como obter residência através de investimento imobiliário",
    description:
      "O programa Green Card de Cabo Verde oferece residência permanente a estrangeiros que investem em imobiliário nas ilhas.",
  },
  "mistakes-buying-property-cape-verde": {
    title: "7 erros caros a evitar ao comprar imóvel em Cabo Verde",
    description:
      "O mercado imobiliário cabo-verdiano é acessível e o processo de compra é relativamente claro, mas há erros que podem custar caro.",
  },
  "sal-vs-santiago-property": {
    title: "Sal vs Santiago: que ilha de Cabo Verde faz sentido para compradores de imóvel?",
    description:
      "Sal e Santiago são dois dos mercados imobiliários mais ativos de Cabo Verde, mas servem perfis de comprador muito diferentes.",
  },
  "off-plan-property-cape-verde-risks": {
    title: "Comprar imóvel em planta em Cabo Verde: riscos, proteções e o que verificar",
    description:
      "Compras em planta são comuns em Cabo Verde, sobretudo em empreendimentos turísticos no Sal e na Boa Vista. Convém saber o que verificar.",
  },
  "cape-verde-property-management-remotely": {
    title: "Gerir imóvel em Cabo Verde à distância: guia para proprietários estrangeiros",
    description:
      "A maioria dos compradores estrangeiros em Cabo Verde não vive na ilha onde o imóvel se encontra. A gestão à distância exige preparação operacional.",
  },
  "financing-property-cape-verde": {
    title: "Como financiar a compra de imóvel em Cabo Verde enquanto comprador estrangeiro",
    description:
      "Compras a pronto dominam o mercado estrangeiro em Cabo Verde. Existem créditos locais, mas são caros e difíceis para não residentes.",
  },
  "boa-vista-property-guide": {
    title: "Guia imobiliário da Boa Vista: o que os compradores precisam de saber em 2026",
    description:
      "A Boa Vista é a segunda grande ilha turística de Cabo Verde e um dos mercados imobiliários mais ativos, muitas vezes vista como alternativa de crescimento ao Sal.",
  },
};

const FAQ_PT: Record<string, { question: string; answer: string; topic: string }> = {
  "Can foreigners buy property in Cape Verde?": {
    question: "Estrangeiros podem comprar imóvel em Cabo Verde?",
    answer:
      "Sim. Cabo Verde permite que estrangeiros comprem imóveis em propriedade plena, com os mesmos direitos dos cidadãos. Não há restrições de nacionalidade nem exigência de residência.",
    topic: "Compra",
  },
  "Do I need a Cape Verdean tax number to buy?": {
    question: "Preciso de um número fiscal cabo-verdiano para comprar?",
    answer:
      "Sim. Cada pessoa cujo nome conste na escritura precisa de um NIF. É emitido na Casa do Cidadão ou no Cartório e normalmente demora de um a cinco dias.",
    topic: "Legal",
  },
  "Do I need a local bank account?": {
    question: "Preciso de uma conta bancária local?",
    answer:
      "Sim. Precisa de uma conta cabo-verdiana para pagar o vendedor, impostos, encargos e custos notariais. O escudo cabo-verdiano está indexado ao euro.",
    topic: "Dinheiro",
  },
  "What taxes apply when buying property?": {
    question: "Que impostos se aplicam na compra de imóvel?",
    answer:
      "Desde 1 de janeiro de 2026, o antigo IUP foi substituído pelo ITI e pelo IPI. Peça a um advogado local qualificado que confirme a matriz, registo predial, valor tributável e situação fiscal antes da escritura.",
    topic: "Fiscal",
  },
  "How long does the buying process take?": {
    question: "Quanto tempo demora o processo de compra?",
    answer:
      "Conte com 6 a 12 semanas entre a oferta aceite e a escritura. O principal bloqueio costuma ser a due diligence: confirmar título, dívidas e ónus.",
    topic: "Prático",
  },
  "Do I need a Cape Verdean lawyer?": {
    question: "Preciso de um advogado cabo-verdiano?",
    answer:
      "É altamente recomendado, e deve ser independente do vendedor. O advogado verifica título, dívidas, contratos e representa-o no notário.",
    topic: "Legal",
  },
  "Can I get a mortgage in Cape Verde?": {
    question: "Posso obter crédito habitação em Cabo Verde?",
    answer:
      "Créditos locais existem para estrangeiros, mas são limitados, geralmente caros e mais difíceis para não residentes. Muitos compradores usam fundos próprios.",
    topic: "Dinheiro",
  },
  "Does owning property give me residency?": {
    question: "Ter imóvel dá direito a residência?",
    answer:
      "Não automaticamente. A propriedade é independente da residência, embora Cabo Verde tenha vias de autorização de residência para proprietários e reformados com rendimento estável.",
    topic: "Residência",
  },
  "Are there annual property taxes?": {
    question: "Existem impostos anuais sobre imóveis?",
    answer:
      "Sim. Desde 2026, o imposto anual sobre propriedade é o IPI. Podem aplicar-se agravamentos em casos específicos, por isso confirme localmente.",
    topic: "Fiscal",
  },
  "Can I rent out the property when I'm not there?": {
    question: "Posso arrendar o imóvel quando não estiver lá?",
    answer:
      "Sim. Arrendamento de longa duração e alojamento turístico são legais, mas o alojamento turístico exige registo e implica obrigações fiscais.",
    topic: "Prático",
  },
  "Which island is best for investment?": {
    question: "Qual é a melhor ilha para investimento?",
    answer:
      "Sal e Boa Vista lideram em arrendamento turístico. Santiago e São Vicente são mais fortes para procura residencial. A melhor ilha depende de rendimento, liquidez e estilo de vida.",
    topic: "Compra",
  },
  "Can I repatriate the proceeds when I sell?": {
    question: "Posso repatriar o dinheiro quando vender?",
    answer:
      "Sim. Cabo Verde não impõe restrições ao repatriamento de receitas de venda para proprietários estrangeiros, usando o processo bancário local.",
    topic: "Dinheiro",
  },
};

function matches(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.join(" \u2007 ").toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export default function BlogList() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  useDocumentMeta(
    t("blog.metaTitle"),
    t("blog.metaDescription"),
  );

  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* Inject FAQPage JSON-LD built from the same FAQ_ENTRIES rendered on
     this page, so the structured data matches visible content. */
  useEffect(() => {
    const SCRIPT_ID = "kv-jsonld-faq";
    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://capeverderealestateindex.com/blog#faq",
      mainEntity: FAQ_ENTRIES.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };

    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((node) => {
      if (node.id !== SCRIPT_ID && node.textContent?.includes('"FAQPage"') && node.textContent.includes("/blog#faq")) {
        node.remove();
      }
    });

    const script = (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ?? document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.dataset.kvJsonld = "blog-faq";
    script.textContent = JSON.stringify(data);
    if (!script.parentNode) document.head.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, []);

  const filteredArticles = useMemo(
    () =>
      BLOG_ARTICLES.filter((a) =>
        matches(query, ARTICLE_PT[a.slug]?.title ?? a.title, ARTICLE_PT[a.slug]?.description ?? a.description, a.tags.join(" ")),
      ),
    [query],
  );

  const filteredFaq = useMemo(
    () =>
      FAQ_ENTRIES.filter((f: FaqEntry) =>
        matches(query, FAQ_PT[f.question]?.question ?? f.question, FAQ_PT[f.question]?.answer ?? f.answer, FAQ_PT[f.question]?.topic ?? f.topic),
      ),
    [query],
  );

  const isSearching = query.trim().length > 0;
  const totalHits = filteredArticles.length + filteredFaq.length;

  return (
    <div className="kv-blog">
      {/* Off-white header band — quieter than the main hero */}
      <header className="kv-blog-head">
        <div className="kv-blog-head-inner">
          <div className="kv-blog-eyebrow">{t("blog.eyebrow")}</div>
          <h1 className="kv-blog-title">
            {t("blog.title")}
          </h1>
          <p className="kv-blog-sub">
            {t("blog.sub")}
          </p>

          <form
            className="kv-blog-search"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <span className="kv-blog-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="kv-blog-search-input"
              placeholder={t("blog.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("blog.searchLabel")}
            />
            {isSearching && (
              <button
                type="button"
                className="kv-blog-search-clear"
                onClick={() => setQuery("")}
                aria-label={t("blog.clearSearch")}
              >
                ×
              </button>
            )}
          </form>

          {isSearching && (
            <div className="kv-blog-search-meta">
              <b>{totalHits}</b> {totalHits === 1 ? t("common.result") : t("common.results")}
              {" · "}
              {filteredArticles.length} {filteredArticles.length === 1 ? t("blog.guide") : t("blog.guides")}
              {" · "}
              {filteredFaq.length} FAQ
            </div>
          )}
        </div>
      </header>

      <section className="kv-blog-body">
        {/* Articles — hide block when searching narrows it to zero */}
        {(filteredArticles.length > 0 || !isSearching) && (
          <div className="kv-blog-section">
            <div className="kv-blog-section-head">
              <div className="kv-blog-section-eyebrow">{t("blog.sectionGuides")}</div>
              <h2 className="kv-blog-section-title">
                {t("blog.longForm")}
              </h2>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="kv-blog-empty">
                <Trans i18nKey="blog.noGuides" values={{ query }} components={{ 1: <b /> }} />
              </div>
            ) : (
              <div className="kv-blog-grid">
                {filteredArticles.map((a, i) => {
                  const cat = categoryFor(a.tags);
                  return (
                    <Link
                      key={a.slug}
                      to={`/blog/${a.slug}`}
                      className="kv-blog-card"
                      data-cat={cat}
                    >
                      <div className="kv-blog-card-band">
                        <span className="kv-eyebrow-cat" data-cat={cat}>{isPt ? categoryLabelPt(cat) : categoryLabel(cat)}</span>
                        <span className="kv-blog-card-num">№ {String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="kv-blog-card-title">{isPt ? ARTICLE_PT[a.slug]?.title ?? a.title : a.title}</div>
                      <div className="kv-blog-card-excerpt">{isPt ? ARTICLE_PT[a.slug]?.description ?? a.description : a.description}</div>
                      <div className="kv-blog-card-foot">
                        <span>{fmtDate(a.date, isPt ? "pt-PT" : "en-GB")}</span>
                        <span>{isPt ? a.readTime.replace("min read", "min de leitura") : a.readTime}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQ — accordion. Hide block entirely if search filters it to zero
            AND there are guide hits, so the page doesn't show an empty FAQ
            section beneath a populated guide grid. */}
        {(filteredFaq.length > 0 || !isSearching || filteredArticles.length === 0) && (
          <div className="kv-blog-section kv-blog-faq-section">
            <div className="kv-blog-section-head">
              <div className="kv-blog-section-eyebrow">FAQ</div>
              <h2 className="kv-blog-section-title">{t("blog.faqTitle")}</h2>
              <p className="kv-blog-section-sub">
                {t("blog.faqSub")}
              </p>
            </div>

            {filteredFaq.length === 0 ? (
              <div className="kv-blog-empty">
                <Trans i18nKey="blog.noFaq" values={{ query }} components={{ 1: <b /> }} />
              </div>
            ) : (
              <div className="kv-faq">
                {filteredFaq.map((f, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={f.question} className={`kv-faq-row${isOpen ? " is-open" : ""}`}>
                      <button
                        type="button"
                        className="kv-faq-q"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                      >
                        <span className="kv-faq-q-topic">{isPt ? FAQ_PT[f.question]?.topic ?? f.topic : f.topic}</span>
                        <span className="kv-faq-q-text">{isPt ? FAQ_PT[f.question]?.question ?? f.question : f.question}</span>
                        <span className="kv-faq-q-icon" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      <div className="kv-faq-a" aria-hidden={!isOpen}>{isPt ? FAQ_PT[f.question]?.answer ?? f.answer : f.answer}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <NewsletterCta />
    </div>
  );
}
