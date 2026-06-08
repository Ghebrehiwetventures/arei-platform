const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { loadSourcesConfig, sourceConfigToFetchConfig } = require("../core/configLoader");
const { parseListingsFromHtml } = require("../core/fetcher/parse/listings");
const { dedupeImageUrls } = require("../core/fetcher/parse/images");

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
