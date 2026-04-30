import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREIClient } from "../../packages/arei-sdk/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const baseHtmlPath = path.join(distDir, "index.html");
const spaFallbackPath = path.join(distDir, "spa-fallback", "index.html");
const blogDataPath = path.resolve(__dirname, "../src/lib/blog-data.ts");
const faqDataPath = path.resolve(__dirname, "../src/lib/faq-data.ts");
const prerenderListingsPath = path.resolve(__dirname, "../src/lib/prerender-listings.ts");
const siteUrl = "https://kazaverde.com";
const ogImage = `${siteUrl}/og-default.png`;
const sitemapPath = path.join(distDir, "sitemap.xml");
const publicSupabaseUrl = "https://bhqjdzjtiwckfuteycfl.supabase.co";
const publicSupabaseAnonKey = "sb_publishable_fFm5NsC3cWLYr_Wnx9OLWQ_Ytmnn-Wd";

function page(title, description, body, options = {}) {
  return { title, description, body, ...options };
}

function getStaticRoutes(blogArticles, listingRoutes = [], faqEntries = []) {
  return [
    {
      route: "/",
      ...page(
      "KazaVerde — Cape Verde Real Estate",
      "Search Cape Verde real estate listings from tracked public sources. Compare homes across Sal, Boa Vista and other islands with KazaVerde.",
      `
        <main>
          <section>
            <p>KazaVerde</p>
            <h1>Cape Verde real estate, aggregated in one place</h1>
            <p>
              An independent property search and data platform for Cape Verde — listings
              aggregated from local agencies, portals and property websites, with
              island-level market context and practical guides for buyers.
            </p>
            <p>
              <a href="/listings">Browse Properties</a>
              <a href="/market">Market Data</a>
            </p>
          </section>

          <section>
            <h2>What you can explore</h2>
            <ul>
              <li>Source-linked property listings tracked across multiple Cape Verde islands</li>
              <li>Market-level context including median price and inventory coverage</li>
              <li>Editorial guides on buying, tax changes, residency, and island selection</li>
            </ul>
          </section>

          <section>
            <h2>Browse by island</h2>
            <ul>
              <li><a href="/listings/sal">Property for sale in Sal</a></li>
              <li><a href="/listings/boa-vista">Property for sale in Boa Vista</a></li>
              <li><a href="/listings">All tracked Cape Verde listings</a></li>
            </ul>
          </section>

          <section>
            <h2>Built for discovery, not transactions</h2>
            <p>
              KazaVerde is not a broker, agency, or marketplace, and listings are not
              legally verified. Each property links back to its original source page, so
              buyers can confirm details directly with the agent and their own lawyer.
            </p>
          </section>
        </main>
      `,
      {
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://kazaverde.com/#organization",
              name: "KazaVerde",
              url: "https://kazaverde.com",
              logo: "https://kazaverde.com/og-default.png",
              description:
                "KazaVerde is an independent property search and data platform for Cape Verde real estate. It is not a broker or agency.",
            },
            {
              "@type": "WebSite",
              "@id": "https://kazaverde.com/#website",
              url: "https://kazaverde.com",
              name: "KazaVerde",
              description:
                "Search Cape Verde real estate listings aggregated from local agencies, portals and property websites.",
              publisher: { "@id": "https://kazaverde.com/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://kazaverde.com/listings?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        },
      },
    ),
    },
    {
      route: "/market",
      ...page(
      "Market Data — KazaVerde",
      "Median prices by island, inventory trends, and Cape Verde property market insights.",
      `
        <main>
          <section>
            <p>Market Intelligence</p>
            <h1>Cape Verde Property Market</h1>
            <p>
              Index-level market data derived from tracked public listings across multiple sources,
              designed to help buyers compare islands before committing capital.
            </p>
          </section>

          <section>
            <h2>What this page covers</h2>
            <ul>
              <li>Median asking prices by island where enough price data is available</li>
              <li>Total tracked inventory across the current public index</li>
              <li>Listing distribution by island and methodology notes for interpretation</li>
            </ul>
          </section>

          <section>
            <h2>Methodology highlights</h2>
            <ul>
              <li>Median asking price is based on publicly visible, extractable listing prices.</li>
              <li>Listings marked price on request remain in inventory counts but not price calculations.</li>
              <li>Tracked sources are rechecked regularly and removed listings are flagged after repeated absence.</li>
            </ul>
          </section>
        </main>
      `,
    ),
    },
    {
      route: "/blog",
      ...page(
      "Blog — KazaVerde",
      "Cape Verde real estate insights, guides, and market analysis. Property buying, islands, legal requirements, and investment tips.",
      `
        <main>
          <section>
            <p>Blog</p>
            <h1>Cape Verde Real Estate Insights</h1>
            <p>Guides, market analysis, and practical advice for property buyers and investors.</p>
          </section>

          <section>
            <h2>Featured guides</h2>
            <ul>
              ${blogArticles.map(
                (article) => `
                  <li>
                    <a href="/blog/${article.slug}">${escapeHtml(article.title)}</a>
                    <p>${escapeHtml(article.description)}</p>
                  </li>
                `,
              ).join("")}
            </ul>
          </section>

          ${faqEntries.length > 0 ? `<section>
            <h2>Frequently asked questions</h2>
            <dl>
              ${faqEntries.map((f) => `
                <dt>${escapeHtml(f.question)}</dt>
                <dd>${escapeHtml(f.answer)}</dd>
              `).join("")}
            </dl>
          </section>` : ""}
        </main>
      `,
      faqEntries.length > 0
        ? {
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "@id": "https://kazaverde.com/blog#faq",
              mainEntity: faqEntries.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            },
          }
        : {},
    ),
    },
    {
      route: "/about",
      ...page(
      "About — KazaVerde",
      "How KazaVerde works. Data sources, update cadence, deduplication, and transparency.",
      `
        <main>
          <section>
            <p>About KazaVerde</p>
            <h1>How the index works</h1>
            <p>
              KazaVerde is a read-only property index for Cape Verde. We collect publicly accessible listing
              data from tracked source pages, normalize it into a consistent format, and link every listing
              back to its original source.
            </p>
          </section>

          <section>
            <h2>What matters most</h2>
            <ul>
              <li>Source-first links back to the original listing page</li>
              <li>Deduplication and normalization instead of duplicated portal noise</li>
              <li>Neutral handling of incomplete data instead of guesswork</li>
              <li>Transparent coverage limits rather than claims of full market coverage</li>
            </ul>
          </section>
        </main>
      `,
    ),
    },
    {
      route: "/privacy",
      ...page(
      "Privacy Policy — KazaVerde",
      "How KazaVerde handles your data, what we collect, and your rights.",
      `
        <main>
          <section>
            <p>Privacy Policy</p>
            <h1>How we handle your data</h1>
            <p>Last updated: 27 March 2026</p>
          </section>

          <section>
            <h2>What we collect</h2>
            <ul>
              <li>Anonymous analytics data through Vercel Web Analytics</li>
              <li>Newsletter email addresses for users who subscribe</li>
              <li>Saved property preferences stored locally in the browser</li>
            </ul>
          </section>

          <section>
            <h2>What we do not collect</h2>
            <p>
              We do not collect payment information, advertising tracker data, or unnecessary personal data.
              Saved properties stay in local browser storage and are not transmitted to KazaVerde servers.
            </p>
          </section>
        </main>
      `,
    ),
    },
    {
      route: "/listings",
      ...page(
      "Cape Verde Properties for Sale — KazaVerde",
      "Browse tracked property listings across Cape Verde. Source-linked homes, apartments, villas, and land for sale on Sal, Boa Vista, Santiago, and more.",
      `
        <main>
          <section>
            <p>Property Listings</p>
            <h1>Cape Verde Properties for Sale</h1>
            <p>
              A read-only index of tracked property listings across Cape Verde. Every listing links back
              to its original source page so buyers can verify details directly before contacting an agent.
            </p>
            <p>
              <a href="/listings/sal">Properties in Sal</a> ·
              <a href="/listings/boa-vista">Properties in Boa Vista</a> ·
              <a href="/listings?island=Santiago">Properties in Santiago</a> ·
              <a href="/listings?island=S%C3%A3o%20Vicente">Properties in São Vicente</a>
            </p>
          </section>

          ${listingRoutes.length > 0 ? `
          <section>
            <h2>Recently tracked properties</h2>
            <ul>
              ${listingRoutes.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}
        </main>
      `,
    ),
    },
    {
      route: "/listings/sal",
      ...page(
      "Property for Sale in Sal, Cape Verde | KazaVerde",
      "Browse property listings for sale in Sal, Cape Verde. Apartments, villas, and resort properties in Santa Maria and across the island.",
      (() => {
        const salListings = listingRoutes.filter(
          (lr) => lr.description.includes(", Sal,") || lr.description.includes("in Sal,")
        );
        return `
        <main>
          <section>
            <p>Sal · Cape Verde</p>
            <h1>Property for Sale in Sal, Cape Verde</h1>
            <p>
              Sal is Cape Verde&#39;s most liquid property market, with international flights direct from London,
              Lisbon, Amsterdam, and Paris. Santa Maria concentrates the strongest rental demand and the widest
              range of apartments, villas, and resort properties for sale. Browse source-linked listings below.
            </p>
            <p><a href="/listings">View all Cape Verde properties</a></p>
          </section>

          ${salListings.length > 0 ? `
          <section>
            <h2>Sal listings in the index</h2>
            <ul>
              ${salListings.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}

          <section>
            <h2>Buying property in Sal</h2>
            <p>
              Sal offers the strongest short-term rental market in Cape Verde, with gross yields of 5–8% reported
              in well-managed resort complexes. It is the most mature and most expensive island to buy on.
              One-bedroom apartments in Santa Maria typically start around €95,000; two-bedroom units in resort
              complexes range from €120,000 to €200,000.
            </p>
            <p>
              <a href="/blog/which-cape-verde-island-property">Compare Sal with other Cape Verde islands</a> ·
              <a href="/blog/cape-verde-rental-yields-realistic">Rental yield analysis</a>
            </p>
          </section>
        </main>
      `})(),
    ),
    },
    {
      route: "/listings/boa-vista",
      ...page(
      "Property for Sale in Boa Vista, Cape Verde | KazaVerde",
      "Browse property listings for sale in Boa Vista, Cape Verde. Beach villas, resort apartments, and coastal properties in Sal Rei and across the island.",
      (() => {
        const boaVistaListings = listingRoutes.filter(
          (lr) => lr.description.includes(", Boa Vista,") || lr.description.includes("in Boa Vista,")
        );
        return `
        <main>
          <section>
            <p>Boa Vista · Cape Verde</p>
            <h1>Property for Sale in Boa Vista, Cape Verde</h1>
            <p>
              Boa Vista is Cape Verde&#39;s main growth market — property prices run 15–25% below equivalent
              properties on Sal, with its own international airport and expanding tourism infrastructure.
              Sal Rei is the commercial center; most development clusters along the coast. Browse
              source-linked listings below.
            </p>
            <p><a href="/listings">View all Cape Verde properties</a></p>
          </section>

          ${boaVistaListings.length > 0 ? `
          <section>
            <h2>Boa Vista listings in the index</h2>
            <ul>
              ${boaVistaListings.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}

          <section>
            <h2>Buying property in Boa Vista</h2>
            <p>
              Boa Vista is often described as where Sal was 5–10 years ago: a growing short-term rental
              market, lower entry prices, and an active development pipeline. For buyers who want beach-island
              investment at a more accessible price point, Boa Vista is the primary alternative to Sal.
            </p>
            <p>
              <a href="/blog/which-cape-verde-island-property">Compare Boa Vista with other Cape Verde islands</a> ·
              <a href="/blog/cape-verde-rental-yields-realistic">Rental yield analysis</a>
            </p>
          </section>
        </main>
      `})(),
    ),
    },
    {
      route: "/cookie-policy",
      ...page(
      "Cookie Policy — KazaVerde",
      "What cookies and local storage KazaVerde uses and why.",
      `
        <main>
          <section>
            <p>Cookie Policy</p>
            <h1>Cookies and local storage</h1>
            <p>Last updated: 27 March 2026</p>
          </section>

          <section>
            <h2>What KazaVerde uses</h2>
            <ul>
              <li>Cookieless Vercel Web Analytics for anonymous traffic measurement</li>
              <li>Local browser storage for saved properties</li>
              <li>Local browser storage for cookie-banner acknowledgement</li>
            </ul>
          </section>

          <section>
            <h2>What KazaVerde does not use</h2>
            <p>
              No advertising cookies, third-party tracking pixels, social media tracking cookies,
              or cross-site behavioral tracking are used on the public site.
            </p>
          </section>
        </main>
      `,
    ),
    },
  ];
}

async function main() {
  const blogArticles = await loadBlogArticles();
  const faqEntries = await loadFaqEntries();
  const listingRoutes = await getListingDetailRoutes();
  const routes = [...getStaticRoutes(blogArticles, listingRoutes, faqEntries), ...getBlogArticleRoutes(blogArticles), ...listingRoutes];
  const baseHtml = await readFile(baseHtmlPath, "utf8");

  await mkdir(path.dirname(spaFallbackPath), { recursive: true });
  await writeFile(spaFallbackPath, baseHtml, "utf8");

  for (const route of routes) {
    const routeHtml = renderRouteHtml(baseHtml, route);
    const outputPath =
      route.route === "/"
        ? baseHtmlPath
        : path.join(distDir, route.route.replace(/^\//, ""), "index.html");

    await mkdir(path.dirname(outputPath), { recursive: true });

    await writeFile(outputPath, routeHtml, "utf8");
  }

  /* Sitemap covers ALL listings (not just the prerendered subset) — those
     are the source of organic traffic. Pulled fresh from Supabase so a new
     listing appears in the sitemap on the next deploy without needing
     prerender-listings.ts to be edited. */
  const allListingRoutes = await getAllListingRoutesForSitemap(listingRoutes);
  await writeSitemap([...routes.filter((r) => !r.route.startsWith("/listing/")), ...allListingRoutes]);
}

async function getAllListingRoutesForSitemap(prerenderedRoutes) {
  try {
    const client = new AREIClient({
      supabaseUrl: process.env.VITE_SUPABASE_URL || publicSupabaseUrl,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || publicSupabaseAnonKey,
    });
    const prerenderedById = new Map(
      prerenderedRoutes.map((r) => [r.route, r]),
    );
    const all = [];
    let page = 1;
    const pageSize = 200;
    /* Loop until we've drained the index. Cap at 50 pages (10k listings) so
       a runaway query can't hang the build. */
    for (let i = 0; i < 50; i++) {
      const res = await client.getListings({ page, pageSize });
      if (!res.data || res.data.length === 0) break;
      all.push(...res.data);
      if (all.length >= res.total) break;
      page += 1;
    }
    return all.map((l) => {
      const route = `/listing/${l.id}`;
      const existing = prerenderedById.get(route);
      if (existing) return existing;
      return {
        route,
        lastmod: l.last_seen_at ? l.last_seen_at.slice(0, 10) : undefined,
      };
    });
  } catch (error) {
    console.warn("[prerender-phase1] Full listing sitemap skipped:", error instanceof Error ? error.message : error);
    return prerenderedRoutes.filter((r) => r.route.startsWith("/listing/"));
  }
}

/* Sitemap is regenerated from the same route list as the HTML output, so it
   stays in sync with whatever we actually prerender. Static routes get the
   default priority; blog articles are weighted slightly lower; listing pages
   get the lowest because they churn (sold/withdrawn). lastmod is build time
   for static and article publish date for blog posts. */
async function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = routes.map((r) => {
    const loc = new URL(r.route, `${siteUrl}/`).toString();
    let priority = "0.7";
    let changefreq = "weekly";
    if (r.route === "/") priority = "1.0";
    else if (r.route.startsWith("/listing/")) {
      priority = "0.5";
      changefreq = "daily";
    } else if (r.route.startsWith("/blog/")) {
      priority = "0.6";
      changefreq = "monthly";
    } else if (r.route === "/listings" || r.route.startsWith("/listings/")) {
      priority = "0.9";
      changefreq = "daily";
    }
    const lastmod = r.lastmod ?? today;
    return `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  await writeFile(sitemapPath, xml, "utf8");
  console.log(`[prerender-phase1] sitemap.xml written with ${routes.length} URLs`);
}

function renderRouteHtml(baseHtml, route) {
  const canonicalUrl = new URL(route.route, `${siteUrl}/`).toString();
  const ogType = route.ogType ?? "website";
  const documentTitle = route.title.includes("KazaVerde") ? route.title : `${route.title} — KazaVerde`;
  const headExtras = [
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(documentTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="KazaVerde" />`,
    `<meta property="og:image" content="${escapeHtml(route.image ?? ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(documentTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(route.image ?? ogImage)}" />`,
  ];
  if (route.jsonLd) {
    const payload = Array.isArray(route.jsonLd) ? route.jsonLd : [route.jsonLd];
    for (const entry of payload) {
      const scriptId = entry?.["@type"] === "RealEstateListing" ? ' id="kv-jsonld-listing"' : "";
      headExtras.push(
        `<script${scriptId} type="application/ld+json">${JSON.stringify(entry).replace(/</g, "\\u003c")}</script>`,
      );
    }
  }
  const headExtrasHtml = headExtras.join("\n    ");

  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(documentTitle)}</title>`)
    .replace(
      /<meta name="description" content="[\s\S]*?" \/>/,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
    )
    .replace("</head>", `    ${headExtrasHtml}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="phase1">\n${wrapPrerenderMarkup(route.body, route.description)}\n    </div>`,
    );
}

function wrapPrerenderMarkup(body, description) {
  return `      <div class="prerender-shell" aria-label="Prerendered page snapshot">
        <header>
          <a href="/">KazaVerde</a>
          <p>${escapeHtml(description)}</p>
        </header>
${indent(body.trim(), 4)}
        <footer>
          <p><a href="/listings">Listings</a> · <a href="/market">Market</a> · <a href="/blog">Blog</a> · <a href="/about">About</a></p>
          <p><a href="/privacy">Privacy</a> · <a href="/cookie-policy">Cookie Policy</a></p>
        </footer>
      </div>`;
}

function indent(text, depth) {
  const pad = " ".repeat(depth * 2);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadFaqEntries() {
  const source = await readFile(faqDataPath, "utf8");
  const sanitizedSource = source
    .replace(/export interface FaqEntry[\s\S]*?\n}\n\n/, "")
    .replace(/export const FAQ_ENTRIES: FaqEntry\[] =/, "const FAQ_ENTRIES =");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(`${sanitizedSource}\nexport { FAQ_ENTRIES };`)}`;
  const module = await import(moduleUrl);
  return module.FAQ_ENTRIES;
}

async function loadBlogArticles() {
  const source = await readFile(blogDataPath, "utf8");
  const sanitizedSource = source
    .replace(/export interface BlogArticle[\s\S]*?\n}\n\n/, "")
    .replace(/export const BLOG_ARTICLES: BlogArticle\[] =/, "const BLOG_ARTICLES =")
    .replace(/\nexport function getArticleBySlug[\s\S]*$/, "\n");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(`${sanitizedSource}\nexport { BLOG_ARTICLES };`)}`;
  const module = await import(moduleUrl);
  return module.BLOG_ARTICLES;
}

async function loadListingPrerenderIds() {
  const source = await readFile(prerenderListingsPath, "utf8");
  const sanitizedSource = source.replace(/ as const;/g, ";");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(sanitizedSource)}`;
  const module = await import(moduleUrl);
  return module.PRERENDER_LISTING_IDS;
}

function getBlogArticleRoutes(blogArticles) {
  return blogArticles.map((article) => ({
    route: `/blog/${article.slug}`,
    lastmod: article.date,
    ...page(
      article.title,
      article.description,
      renderBlogArticleBody(article),
      { ogType: "article", image: article.heroImage || ogImage },
    ),
  }));
}

function renderBlogArticleBody(article) {
  const formattedDate = new Date(`${article.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `
    <main>
      <a href="/blog">Back to blog</a>

      <article>
        <p>${escapeHtml(formattedDate)} · ${escapeHtml(article.readTime)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p>${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join(" ")}</p>
        <div>
${indent(article.content.trim(), 5)}
        </div>
      </article>
    </main>
  `;
}

async function getListingDetailRoutes() {
  try {
    const client = new AREIClient({
      supabaseUrl: process.env.VITE_SUPABASE_URL || publicSupabaseUrl,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || publicSupabaseAnonKey,
    });
    const listingIds = await loadListingPrerenderIds();
    const details = await Promise.all(
      listingIds.map(async (id) => {
        try {
          return await client.getListing(id);
        } catch (error) {
          console.warn(`[prerender-phase1] Skipping listing ${id}:`, error instanceof Error ? error.message : error);
          return null;
        }
      }),
    );

    return details
      .filter((detail) => detail !== null)
      .map((detail) => ({
        route: `/listing/${detail.id}`,
        lastmod: detail.last_seen_at ? detail.last_seen_at.slice(0, 10) : undefined,
        ...page(
          buildListingSeoTitle(detail),
          buildListingSeoDescription(detail),
          renderListingDetailBody(detail),
          {
            ogType: "website",
            image: detail.image_urls[0] || ogImage,
            jsonLd: buildListingJsonLd(detail),
          },
        ),
      }));
  } catch (error) {
    console.warn("[prerender-phase1] Listing prerender skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}

function buildListingSeoTitle(detail) {
  return toTitleCase(detail.title || "Property");
}

function buildListingSeoDescription(detail) {
  const title = buildListingSeoTitle(detail);
  const parts = [
    `${title} in ${detail.city ? `${detail.city}, ` : ""}${detail.island}, Cape Verde.`,
  ];

  if (detail.price) {
    parts.push(`Asking price ${formatPrice(detail.price, detail.currency)}.`);
  }

  if (detail.property_type) {
    parts.push(`Source-linked ${String(detail.property_type).toLowerCase()} listing on KazaVerde.`);
  } else {
    parts.push("Source-linked property listing on KazaVerde.");
  }

  return truncateSeoText(parts.join(" "));
}

function truncateSeoText(value, maxLength = 155) {
  const compact = String(value).replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  const suffix = "...";
  const limit = maxLength - suffix.length;
  const slice = compact.slice(0, limit + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cutAt = lastSpace >= 90 ? lastSpace : limit;
  return `${compact.slice(0, cutAt).trim()}${suffix}`;
}

function buildListingJsonLd(detail) {
  const route = `/listing/${detail.id}`;
  const url = new URL(route, `${siteUrl}/`).toString();
  const residenceType = mapResidenceType(detail.property_type);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: buildListingSeoTitle(detail),
    url,
    description: (detail.description || buildListingSeoDescription(detail)).slice(0, 500),
    datePosted: detail.first_seen_at ?? detail.last_seen_at ?? undefined,
    image: detail.image_urls.length > 0 ? detail.image_urls.slice(0, 6) : undefined,
    mainEntity: {
      "@type": residenceType,
      address: {
        "@type": "PostalAddress",
        addressLocality: detail.city || undefined,
        addressRegion: detail.island,
        addressCountry: "CV",
      },
      numberOfRooms: detail.bedrooms ?? undefined,
      numberOfBathroomsTotal: detail.bathrooms ?? undefined,
      floorSize: detail.property_size_sqm
        ? { "@type": "QuantitativeValue", value: detail.property_size_sqm, unitCode: "MTK" }
        : undefined,
    },
    offers: detail.price
      ? {
          "@type": "Offer",
          price: detail.price,
          priceCurrency: detail.currency || "EUR",
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined,
  };
}

function mapResidenceType(propertyType) {
  const t = String(propertyType || "").toLowerCase();
  if (/apart|flat|condo/.test(t)) return "Apartment";
  if (/villa|house|moradia|casa|chalet/.test(t)) return "House";
  if (/single.?family/.test(t)) return "SingleFamilyResidence";
  if (/land|plot|terreno|parcela|terrain|lot/.test(t)) return "Place";
  return "Residence";
}

function renderListingDetailBody(detail) {
  const specs = [];

  if (detail.property_type) {
    specs.push({ label: "Type", value: detail.property_type });
  }

  if (!isLandListing(detail) && detail.bedrooms != null) {
    specs.push({ label: detail.bedrooms === 0 ? "Layout" : "Bedrooms", value: detail.bedrooms === 0 ? "Studio" : String(detail.bedrooms) });
  }

  if (!isLandListing(detail) && detail.bathrooms != null && detail.bathrooms > 0) {
    specs.push({ label: "Bathrooms", value: String(detail.bathrooms) });
  }

  if (detail.property_size_sqm != null) {
    specs.push({ label: "Interior", value: `${detail.property_size_sqm.toLocaleString("en-US")} m²` });
  }

  if (detail.land_area_sqm != null) {
    specs.push({ label: "Land", value: `${detail.land_area_sqm.toLocaleString("en-US")} m²` });
  }

  const descriptionHtml = detail.description_html || (detail.description ? `<p>${escapeHtml(detail.description)}</p>` : "");
  const lastChecked = detail.last_seen_at
    ? new Date(detail.last_seen_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  const firstImage = detail.image_urls[0];

  return `
    <main>
      <a href="/listings">Back to listings</a>

      <article>
        <p>${escapeHtml(formatLocation(detail.city, detail.island))}, Cape Verde</p>
        <h1>${escapeHtml(buildListingSeoTitle(detail))}</h1>
        <p>${escapeHtml(formatPrice(detail.price, detail.currency))}</p>
        <p>
          <a href="/listings">All Cape Verde listings</a> ·
          <a href="/listings?island=${encodeURIComponent(detail.island)}">${escapeHtml(detail.island)} listings</a> ·
          <a href="/market">Market data</a> ·
          <a href="/about">How KazaVerde works</a>
        </p>
        ${firstImage ? `<p><img src="${escapeHtml(firstImage)}" alt="${escapeHtml(buildListingSeoTitle(detail))}" loading="eager" /></p>` : ""}
        ${specs.length > 0 ? `<ul>\n${specs.map((spec) => `          <li><strong>${escapeHtml(spec.label)}:</strong> ${escapeHtml(spec.value)}</li>`).join("\n")}\n        </ul>` : ""}
        <div>
${indent(descriptionHtml.trim() || "<p>Property details available on the source listing page.</p>", 5)}
        </div>
        <p>Source: <a href="${escapeHtml(detail.source_url)}">${escapeHtml(formatSourceLabel(detail.source_id))}</a></p>
        ${lastChecked ? `<p>Last checked: ${escapeHtml(lastChecked)}</p>` : ""}
        <p>
          Browse more <a href="/listings?island=${encodeURIComponent(detail.island)}">${escapeHtml(detail.island)} property listings</a>
          or compare asking-price context on the <a href="/market">Cape Verde market data</a> page.
        </p>
      </article>
    </main>
  `;
}

function formatPrice(price, currency = "EUR") {
  if (!price || price <= 0) return "Price on request";
  const symbol = currency === "CVE" ? "CVE " : "€";
  return `${symbol}${price.toLocaleString("en-US")}`;
}

function formatLocation(city, island) {
  return city ? `${city}, ${island}` : island;
}

function formatSourceLabel(sourceId) {
  const knownLabels = {
    cv_gabetticasecapoverde: "Gabetti Case Cape Verde",
    cv_terracaboverde: "Terra Cabo Verde",
    tcv: "Terra Cabo Verde",
    ecv: "EstateCV",
  };
  const prefix = String(sourceId || "").split(/[:_]/)[0];
  return knownLabels[sourceId] || knownLabels[prefix] || String(sourceId || "Partner listing");
}

function isLandListing(detail) {
  const landTypes = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;
  const landTitle = /\b(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)\b/i;
  return landTypes.test(detail.property_type ?? "") || landTitle.test(detail.title ?? "");
}

function toTitleCase(value) {
  if (!value || value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (char) => char.toUpperCase());
}

main().catch((error) => {
  console.error("[prerender-phase1] Failed:", error);
  process.exitCode = 1;
});
