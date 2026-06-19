import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { formatDate, toLocale } from "../lib/formatters";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import { FAQ_ENTRIES, type FaqEntry } from "../lib/faq-data";
import NewsletterCta from "../components/NewsletterCta";
import PageHeader from "../components/PageHeader";
import CategoryFilter from "../components/CategoryFilter";
import SectionHead from "../components/SectionHead";
import "./BlogList.css";


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
      "Sim. Estrangeiros podem comprar imóveis privados em Cabo Verde no mesmo enquadramento geral de investimento, independentemente da nacionalidade. Cada compra fica sujeita a verificações de título, cadastro, urbanismo, fiscais e de registo. Confirme o tipo de direito exato indicado no título, em vez de o descrever genericamente como propriedade plena.",
    topic: "Compra",
  },
  "Do I need a Cape Verdean tax number to buy?": {
    question: "Preciso de um número fiscal cabo-verdiano para comprar?",
    answer:
      "Sim. Obtenha um NIF cabo-verdiano antes da escritura; cada comprador registado deve contar precisar de um. A DNRE emite-o gratuitamente nas Repartições de Finanças ou na Casa do Cidadão. Um não residente tem de nomear um representante legal domiciliado em Cabo Verde para o pedido.",
    topic: "Legal",
  },
  "Do I need a local bank account?": {
    question: "Preciso de uma conta bancária local?",
    answer:
      "Uma conta bancária local é frequente, mas os requisitos variam consoante o banco, o financiamento e a estrutura da transação. Confirme o circuito de pagamento e de origem de fundos com o banco, o advogado e o notário antes de transferir. O escudo está indexado a 110,265 CVE por euro.",
    topic: "Dinheiro",
  },
  "What taxes apply when buying property?": {
    question: "Que impostos se aplicam na compra de imóvel?",
    answer:
      "Desde 1 de janeiro de 2026, o ITI aplica-se às transmissões e o IPI à propriedade. O ITI é geralmente 1% do valor tributável, subindo para 3% quando o vendedor ou o comprador beneficia de regime fiscal privilegiado. Podem existir outros custos; confirme a matriz predial, o registo predial, o valor tributável, a situação fiscal e qualquer isenção ou agravamento.",
    topic: "Fiscal",
  },
  "How long does the buying process take?": {
    question: "Quanto tempo demora o processo de compra?",
    answer:
      "Não há um prazo-padrão garantido. A conclusão depende da regularidade do título e do cadastro, da due diligence, da situação fiscal, do financiamento e da disponibilidade do notário e do registo. Qualquer sinal de reserva é contratual; registe por escrito o valor, as condições e a reembolsabilidade, e mande rever antes de pagar.",
    topic: "Prático",
  },
  "Do I need a Cape Verdean lawyer?": {
    question: "Preciso de um advogado cabo-verdiano?",
    answer:
      "É altamente recomendável aconselhamento jurídico independente em Cabo Verde. Use um advogado que não represente o vendedor para verificar título, registos, dívidas, situação urbanística, contratos e situação fiscal. Os honorários variam, por isso peça âmbito e orçamento por escrito. A conclusão à distância pode ser possível com uma procuração devidamente outorgada.",
    topic: "Legal",
  },
  "Can I get a mortgage in Cape Verde?": {
    question: "Posso obter crédito habitação em Cabo Verde?",
    answer:
      "Sim, alguns bancos concedem crédito a não residentes, sujeito a análise. Em junho de 2026, a Caixa anunciava crédito em CVE ou EUR, financiando até 70%, com pelo menos 30% de entrada do comprador. As taxas e a aprovação dependem do banco e do mutuário; confirme as condições atuais diretamente com o credor.",
    topic: "Dinheiro",
  },
  "Does owning property give me residency?": {
    question: "Ter imóvel dá direito a residência?",
    answer:
      "Não. A propriedade, por si só, não confere residência. Uma compra residencial elegível pode apoiar um pedido de Green Card nos limiares legais de 80 000 € ou 120 000 €, consoante a categoria de PIB do município, e tem de ser paga com fundos transferidos do estrangeiro. O pedido exige documentos e aprovação; outras vias de residência são separadas.",
    topic: "Residência",
  },
  "Are there annual property taxes?": {
    question: "Existem impostos anuais sobre imóveis?",
    answer:
      "Sim. Desde 1 de janeiro de 2026, o IPI aplica-se à taxa geral de 0,1% do valor tributável. A taxa de 0,15% aplica-se especificamente a terrenos classificados para construção, não a todos os terrenos. O valor pode ser agravado para prédios urbanos devolutos, em ruína ou degradados e inseguros, e para fachadas principais inacabadas.",
    topic: "Fiscal",
  },
  "Can I rent out the property when I'm not there?": {
    question: "Posso arrendar o imóvel quando não estiver lá?",
    answer:
      "Sim, sujeito a regras de arrendamento, turismo, fiscais e de licenciamento. As estadias turísticas em apartamentos, moradias ou quartos enquadram-se no regime de Alojamento Complementar (AC), que exige registo/licenciamento e a cobrança da contribuição turística. Um requerente individual estrangeiro ou gerente de empresa estrangeira tem de apresentar título de residência em Cabo Verde ou prova de pedido de residência; um proprietário não residente deve confirmar a estrutura de exploração licenciada adequada.",
    topic: "Prático",
  },
  "Which island is best for investment?": {
    question: "Qual é a melhor ilha para investimento?",
    answer:
      "Não há uma ilha universalmente melhor. Compare a localização exata, o título jurídico, os custos totais de operação, a ocupação, a procura a longo prazo e a profundidade de revenda. Trate com cautela os rankings de rentabilidade ou liquidez por ilha, salvo se forem sustentados por dados atuais e divulgados.",
    topic: "Compra",
  },
  "Can I repatriate the proceeds when I sell?": {
    question: "Posso repatriar o dinheiro quando vender?",
    answer:
      "Em geral sim, mas não sem condições. Investidores externos podem converter e transferir o produto da venda depois de cumpridas as obrigações aplicáveis, desde que o investimento tenha sido devidamente registado no Banco de Cabo Verde. Conte que o banco ou o BCV peçam documentação de venda, fiscal, de registo, de origem de fundos e de AML/FX; podem existir controlos de calendário excecionais.",
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
  const locale = toLocale(i18n.language);
  useDocumentMeta(
    t("blog.metaTitle"),
    t("blog.metaDescription"),
  );

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
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

  // Only article categories that actually exist, in a fixed order.
  const presentCategories = useMemo(() => {
    const order: Array<"market" | "buying" | "legal" | "tax"> = [
      "market",
      "buying",
      "legal",
      "tax",
    ];
    const present = new Set(BLOG_ARTICLES.map((a) => categoryFor(a.tags)));
    return order
      .filter((c) => present.has(c))
      .map((c) => ({
        value: c,
        label: isPt ? categoryLabelPt(c) : categoryLabel(c),
        // Same step the marker uses in globals.css (market·buying·legal·tax
        // → --kv-cat-1..4), so the filter underline matches the card dot.
        tone: `var(--kv-cat-${order.indexOf(c) + 1})`,
      }));
  }, [isPt]);

  const displayedArticles = useMemo(
    () =>
      activeCat === null
        ? filteredArticles
        : filteredArticles.filter((a) => categoryFor(a.tags) === activeCat),
    [filteredArticles, activeCat],
  );

  const isSearching = query.trim().length > 0;
  const totalHits = filteredArticles.length + filteredFaq.length;

  return (
    <div className="kv-blog">
      {/* Off-white header band — quieter than the main hero */}
      <PageHeader
        eyebrow={t("blog.eyebrow")}
        title={t("blog.title")}
        sub={t("blog.sub")}
      >
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

        <CategoryFilter
          allLabel={t("common.allCategories")}
          options={presentCategories}
          active={activeCat}
          onChange={setActiveCat}
        />

        {isSearching && (
          <div className="kv-blog-search-meta">
            <b>{totalHits}</b> {totalHits === 1 ? t("common.result") : t("common.results")}
            {" · "}
            {filteredArticles.length} {filteredArticles.length === 1 ? t("blog.guide") : t("blog.guides")}
            {" · "}
            {filteredFaq.length} FAQ
          </div>
        )}
      </PageHeader>

      <section className="kv-blog-body">
        {/* Articles — hide block when searching narrows it to zero */}
        {(displayedArticles.length > 0 || !isSearching) && (
          <div className="kv-blog-section">
            <SectionHead
              eyebrow={t("blog.sectionGuides")}
              title={t("blog.longForm")}
            />

            {displayedArticles.length === 0 ? (
              <div className="kv-blog-empty">
                <Trans i18nKey="blog.noGuides" values={{ query }} components={{ 1: <b /> }} />
              </div>
            ) : (
              <div className="kv-blog-grid">
                {displayedArticles.map((a, i) => {
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
                        <span>{formatDate(a.date, locale)}</span>
                        <span>{isPt ? a.readTime.replace("min read", "min de leitura") : a.readTime}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQ — accordion. Hidden while a category filter is active (the
            category is an article-grid concept; FAQ has its own taxonomy).
            Otherwise hide if search filters it to zero AND there are guide
            hits, so the page doesn't show an empty FAQ below a full grid. */}
        {activeCat === null &&
          (filteredFaq.length > 0 || !isSearching || displayedArticles.length === 0) && (
          <div className="kv-blog-section kv-blog-faq-section">
            <SectionHead eyebrow="FAQ" title={t("blog.faqTitle")} sub={t("blog.faqSub")} />

            {filteredFaq.length === 0 ? (
              <div className="kv-blog-empty">
                <Trans i18nKey="blog.noFaq" values={{ query }} components={{ 1: <b /> }} />
              </div>
            ) : (
              <>
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

                {/* Legal/editorial note + compact source disclosure. Low-emphasis,
                    reuses the site-wide .kv-disclaimer treatment (mono, dim). */}
                <div className="kv-faq-legal">
                  <p className="kv-disclaimer kv-faq-legal-note">{t("blog.faqNote")}</p>
                  <p className="kv-disclaimer kv-faq-legal-sources">{t("blog.faqSources")}</p>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <NewsletterCta />
    </div>
  );
}
