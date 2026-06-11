const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { loadSourcesConfig, sourceConfigToFetchConfig } = require("../core/configLoader");
const { parseListingsFromHtml } = require("../core/fetcher/parse/listings");
const { dedupeImageUrls } = require("../core/fetcher/parse/images");

test("CSS background extraction scopes shared Elementor card classes by unique wrapper class", () => {
  const config = {
    id: "cv_terracaboverde",
    name: "Terra Cabo Verde",
    base_url: "https://terracaboverde.com/properties/",
    fetch_method: "http",
    pagination: { type: "none" },
    selectors: {
      listing: ".e-loop-item",
      link: "a[href*='/properties/']",
      title: "h3",
      image: "img",
    },
    id_prefix: "tcv",
  };
  const html = `
    <style>
      .elementor-101 .shared-image { background-image: url("https://cdn.example.com/one.jpg"); }
      .elementor-202 .shared-image { background-image: url("https://cdn.example.com/two.jpg"); }
    </style>
    <article class="elementor e-loop-item elementor-101">
      <a href="/properties/one/"><h3>Property One</h3></a>
      <div class="shared-image"></div>
    </article>
    <article class="elementor e-loop-item elementor-202">
      <a href="/properties/two/"><h3>Property Two</h3></a>
      <div class="shared-image"></div>
    </article>
  `;

  const rows = parseListingsFromHtml(
    html,
    config,
    new Set(),
    new Date("2026-06-08T00:00:00.000Z"),
  );

  assert.deepEqual(rows.map((row) => row.imageUrls), [
    ["https://cdn.example.com/one.jpg"],
    ["https://cdn.example.com/two.jpg"],
  ]);
});

test("NhaKaza list parsing keeps the short sale card and excludes featured rentals", () => {
  const loaded = loadSourcesConfig("cv");
  assert.equal(loaded.success, true, loaded.error);
  const source = loaded.data.sources.find((candidate) => candidate.id === "cv_nhakaza");
  assert.ok(source);

  const config = sourceConfigToFetchConfig(source);
  const html = `
    <aside>
      <div class="feat_property home7 agent">
        <a href="/arrendar-apartamento/praia-santiago/rental/?view_page=show_ad&id=1603">
          <img src="/file.php?filename=/1603/med/rental.jpeg">
          <h4>Featured rental apartment</h4>
        </a>
        <a class="fp_price">5.500$00</a>
      </div>
    </aside>
    <main class="col-md-12 col-lg-8">
      <div class="feat_property list">
        <div class="thumb">
          <a href="/comprar-apartamento/vila-de-santa-maria-sal/apartamento-t1/?view_page=show_ad&id=1657">
            <img src="/file.php?filename=/1657/med/sale.jpg">
          </a>
        </div>
        <a href="/comprar-apartamento/vila-de-santa-maria-sal/apartamento-t1/?view_page=show_ad&id=1657">
          <h4>Apartamento T1</h4>
        </a>
        <a class="fp_price">8.821.200$00</a>
      </div>
    </main>
  `;

  const rows = parseListingsFromHtml(
    html,
    config,
    new Set(),
    new Date("2026-06-08T00:00:00.000Z"),
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Apartamento T1");
  assert.equal(rows[0].price, 8821200);
  assert.match(rows[0].detailUrl, /\/comprar-apartamento\//);
  assert.deepEqual(rows[0].imageUrls, [
    "https://nhakaza.cv/file.php?filename=/1657/med/sale.jpg",
  ]);
});

test("image dedupe preserves distinct query-backed file.php images", () => {
  assert.deepEqual(
    dedupeImageUrls([
      "https://nhakaza.cv/file.php?filename=/1657/med/one.jpg",
      "https://nhakaza.cv/file.php?filename=/1657/med/two.jpg",
    ]),
    [
      "https://nhakaza.cv/file.php?filename=/1657/med/one.jpg",
      "https://nhakaza.cv/file.php?filename=/1657/med/two.jpg",
    ],
  );
});
