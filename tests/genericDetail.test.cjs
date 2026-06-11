const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { loadSourcesConfig } = require("../core/configLoader");
const { createGenericDetailPlugin } = require("../core/detail/plugins/genericDetail");

test("extracts Terra Cabo Verde sales area and word-form bedrooms from current markup", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_terracaboverde");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_terracaboverde",
    source.detail,
    source.price_format,
  );

  const result = plugin.extract(`
    <div class="elementor-widget">
      <ul>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Area: </span>Praia de Cabral</span></li>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Sales area: </span>75,8 sqm</span></li>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Category: </span>Apartment</span></li>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Bedrooms: </span>0</span></li>
      </ul>
    </div>
    <div class="elementor-widget-text-editor">
      <p>The sleeping area features two large, bright bedrooms with natural ventilation.</p>
    </div>
  `, "https://www.terracaboverde.com/properties/example");

  assert.equal(result.areaSqm, 76);
  assert.equal(result.bedrooms, 2);
  assert.equal(result.propertyType, "apartment");
});

test("ignores Terra Cabo Verde unit-code Area row and uses Sales area for sqm", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_terracaboverde");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_terracaboverde",
    source.detail,
    source.price_format,
  );

  // Real production markup: the "Area:" row holds a unit/neighborhood CODE
  // ("En-bv-01"), not a number. Its trailing digits must not be parsed as area;
  // the structured "Sales area" value is the real m² figure.
  const result = plugin.extract(`
    <div class="elementor-widget">
      <ul>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Area: </span>En-bv-01</span></li>
        <li><span class="elementor-icon-list-text"><span class="pre-data">Sales area: </span>61,91 sqm</span></li>
      </ul>
    </div>
  `, "https://www.terracaboverde.com/properties/one-bedroom-flat-for-sale-in-estrela-do-mar-2");

  assert.equal(result.areaSqm, 62);
});

test("keeps Terra Cabo Verde images scoped to the current property gallery", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_terracaboverde");
  const plugin = createGenericDetailPlugin("cv_terracaboverde", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="swiper-slide">
      <a href="https://www.terracaboverde.com/wp-content/uploads/2024/12/img-immobili-cover.jpg">
        Site chrome
      </a>
    </div>
    <div class="related-properties swiper-slide">
      <a href="https://www.terracaboverde.com/wp-content/uploads/2026/05/unrelated-listing.jpg">
        Related listing
      </a>
    </div>
    <div id="prop-gallery">
      <div class="elementor-image-carousel">
        <img src="https://www.terracaboverde.com/wp-content/uploads/2026/05/current-1.jpg">
        <img src="https://www.terracaboverde.com/wp-content/uploads/2026/05/current-2.jpg">
        <img src="https://www.terracaboverde.com/wp-content/uploads/2026/05/current-3.jpg">
      </div>
    </div>
  `, "https://www.terracaboverde.com/properties/example");

  assert.deepEqual(result.imageUrls, [
    "https://www.terracaboverde.com/wp-content/uploads/2026/05/current-1.jpg",
    "https://www.terracaboverde.com/wp-content/uploads/2026/05/current-2.jpg",
    "https://www.terracaboverde.com/wp-content/uploads/2026/05/current-3.jpg",
  ]);
});

test("extracts EstateCV detail fields from current source markup", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_estatecv",
    source.detail,
    source.price_format,
  );

  const html = `
    <html>
      <body>
        <strong class="property-info__price">97 776 €</strong>
        <div class="pageContent__text">
          <p>This penthouse features 4 en-suite bedrooms and two bathrooms.</p>
        </div>
        <div class="property-summary__list">
          <table>
            <tr><td>Price</td><td>97 776 €</td></tr>
            <tr><td>Area</td><td>87 040 m2</td></tr>
          </table>
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(
    html,
    "https://estatecv.com/en/properties/apartments/example",
  );

  assert.equal(result.price, 97776);
  assert.equal(result.bedrooms, 4);
  assert.equal(result.bathrooms, 2);
  assert.equal(result.areaSqm, 87040);
});

test("infers EstateCV bathroom count when every known bedroom is en-suite", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="pageContent__text">
      <p>Apartment T2. Each bedroom has an ensuite bathroom.</p>
    </div>
  `, "https://estatecv.com/en/properties/apartments/example");

  assert.equal(result.bedrooms, 2);
  assert.equal(result.bathrooms, 2);
});

test("does not turn EstateCV area ranges into a single exact area", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="property-summary__list">
      <table><tr><td>Area</td><td>300 - 3000 m²</td></tr></table>
    </div>
  `, "https://estatecv.com/en/properties/lands/example");

  assert.equal(result.areaSqm, null);
});

test("EstateCV structured area ranges block conflicting JSON-LD fallbacks", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <script type="application/ld+json">
      {
        "@type": "House",
        "floorSize": { "value": 200000, "unitText": "m2" }
      }
    </script>
    <div class="property-summary__list">
      <table><tr><td>Area</td><td>up to 20000 m²</td></tr></table>
    </div>
  `, "https://estatecv.com/en/properties/lands/example");

  assert.equal(result.areaSqm, null);
});

test("EstateCV houses prefer total usable area over plot area", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="property-summary__list">
      <table>
        <tr><td>Plot area</td><td>200 m²</td></tr>
        <tr><td>Total usable area</td><td>367,64 m²</td></tr>
        <tr><td>Interior usable area</td><td>262,83 m²</td></tr>
      </table>
    </div>
  `, "https://estatecv.com/en/properties/houses/example");

  assert.equal(result.areaSqm, 368);
});

test("EstateCV extracts localized total usable area labels", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="property-summary__list">
      <table>
        <tr><td>Plocha parcely</td><td>200 m²</td></tr>
        <tr><td>Celková užitná plocha</td><td>367,64 m²</td></tr>
      </table>
    </div>
  `, "https://estatecv.com/en/properties/houses/duargema-delta-07");

  assert.equal(result.areaSqm, 368);
});

test("infers two bathrooms from a primary suite plus a shared bathroom", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin("cv_estatecv", source.detail, source.price_format);

  const result = plugin.extract(`
    <div class="pageContent__text">
      <p>
        Villa T3. The master bedroom is a suite with its own bathroom;
        the other two bedrooms share a bathroom.
      </p>
    </div>
  `, "https://estatecv.com/en/properties/houses/example");

  assert.equal(result.bedrooms, 3);
  assert.equal(result.bathrooms, 2);
});

test("prefers structured bathroom and bedroom selectors over description regex matches", () => {
  const plugin = createGenericDetailPlugin("cv_ccoreinvestments", {
    selectors: {
      description: ".contentText",
      bedrooms: ".detailsBar__list i.fa-bed + span",
      bathrooms: ".detailsBar__list i.fa-shower + span",
    },
    spec_patterns: {
      bedrooms: [
        "(\\d+)\\s*(?:Bedrooms?|Beds?)",
      ],
      bathrooms: [
        "(\\d+)\\s*(?:Bathrooms?|Baths?)",
      ],
    },
  });

  const html = `
    <html>
      <body>
        <ul class="detailsBar__list">
          <li><div class="detailsBar__detail"><i class="fa fa-bed"></i><span>2</span></div></li>
          <li><div class="detailsBar__detail"><i class="fa fa-shower"></i><span>2</span></div></li>
        </ul>
        <div class="contentText">
          Apartment Features
          1 bedroom suite with private bathroom
          1 Bedroom
          1 Bathroom
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.ccoreinvestments.com/en/property-detail/example/731730");

  assert.equal(result.bedrooms, 2);
  assert.equal(result.bathrooms, 2);
});

test("extracts Ocean Property bedroom and bathroom fields from dedicated detail nodes", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_oceanproperty24");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_oceanproperty24",
    source.detail,
    source.price_format,
  );

  const result = plugin.extract(`
    <div class="listing_detail property_default_rooms"><strong>Rooms:</strong> 1</div>
    <div class="listing_detail property_default_bedrooms"><strong>Bedrooms:</strong> 2</div>
    <div class="listing_detail property_default_bathrooms"><strong>Bathrooms:</strong> 1</div>
  `, "https://www.oceanproperty24.com/properties/beautiful-2-bedroom-apartment");

  assert.equal(result.bedrooms, 2);
  assert.equal(result.bathrooms, 1);
});

test("extracts NhaKaza Portuguese specs and query-backed gallery images", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_nhakaza");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_nhakaza",
    source.detail,
    source.price_format,
  );

  const result = plugin.extract(`
    <div class="listing_single_description">
      <ul>
        <li><a>Tipologia: T1</a></li>
        <li><a>Área: 60M<sup>2</sup></a></li>
        <li><a>WC: 1</a></li>
      </ul>
      <h4>Descrição Imóvel</h4>
      <p>Apartamento totalmente equipado em Achada Santo António, perto de serviços, transportes e comércio local.</p>
    </div>
    <section class="listing-title-area p0">
      <img src="/file.php?filename=/1603/med/one.jpeg">
      <img src="/file.php?filename=/1603/med/two.jpeg">
    </section>
    <aside>
      <img src="/file.php?filename=/1607/med/unrelated-rental.jpeg">
    </aside>
  `, "https://nhakaza.cv/arrendar-apartamento/example/?view_page=show_ad&id=1603");

  assert.equal(result.bedrooms, 1);
  assert.equal(result.bathrooms, 1);
  assert.equal(result.areaSqm, 60);
  assert.deepEqual(result.imageUrls, [
    "https://nhakaza.cv/file.php?filename=/1603/med/one.jpeg",
    "https://nhakaza.cv/file.php?filename=/1603/med/two.jpeg",
  ]);
});

test("extracts CCore gross-area detail bar values with comma decimals", () => {
  const plugin = createGenericDetailPlugin("cv_ccoreinvestments", {
    selectors: {
      area: ".detailsBar__list i.proppy-icon-gross-area-24-custom + span",
    },
  });

  const html = `
    <html>
      <body>
        <ul class="detailsBar__list">
          <li><div class="detailsBar__detail"><i class="fa fa-bed"></i><span>1</span></div></li>
          <li><div class="detailsBar__detail"><i class="fa fa-shower"></i><span>1</span></div></li>
          <li>
            <div class="detailsBar__detail">
              <i class="proppy-icon proppy-icon-gross-area-24-custom"></i>
              <span>55,56 m<sup>2</sup></span>
            </div>
          </li>
        </ul>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.ccoreinvestments.com/en/property-detail/example/839806");

  assert.equal(result.areaSqm, 56);
});

test("extracts CCore home-icon detail bar area values from source config", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_ccoreinvestments");
  assert.ok(source);

  const plugin = createGenericDetailPlugin("cv_ccoreinvestments", source.detail);

  const html = `
    <html>
      <body>
        <div class="contentText">
          A normal long listing description that should scope regex fallback away
          from the details bar and leave selector extraction responsible for area.
        </div>
        <ul class="detailsBar__list">
          <li><div class="detailsBar__detail"><i class="fa fa-bed"></i><span>2</span></div></li>
          <li><div class="detailsBar__detail"><i class="fa fa-shower"></i><span>2</span></div></li>
          <li>
            <div class="detailsBar__detail">
              <i class="proppy-icon proppy-icon-home-32"></i>
              <span>64,85 m<sup>2</sup></span>
            </div>
          </li>
        </ul>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.ccoreinvestments.com/en/property-detail/example/824599");

  assert.equal(result.areaSqm, 65);
});

test("extracts Cape Verde Property 24 OSProperty core fields from source config", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_capeverdeproperty24");
  assert.ok(source);
  assert.deepEqual(source.detail.spec_table, {
    container: "#propertydetails .corefields",
    label_selector: ".fieldlabel",
    value_selector: "+ .fieldvalue",
    label_map: {
      bedrooms: ["bed"],
      bathrooms: ["bath"],
      area: ["square meter"],
    },
  });

  const plugin = createGenericDetailPlugin(
    "cv_capeverdeproperty24",
    source.detail,
    source.price_format,
  );

  const html = `
    <html>
      <body>
        <div id="propertydetails">
          <div class="row-fluid corefields">
            <div class="row-fluid">
              <div class="span12">
                <div class="fieldlabel">Bed</div>
                <div class="fieldvalue">1</div>
              </div>
            </div>
            <div class="row-fluid">
              <div class="span12">
                <div class="fieldlabel">Bath</div>
                <div class="fieldvalue">1</div>
              </div>
            </div>
            <div class="row-fluid">
              <div class="span12">
                <div class="fieldlabel">Square meter</div>
                <div class="fieldvalue">60.00 sqmt</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://capeverdeproperty24.com/en/brl10-2");

  assert.equal(result.bedrooms, 1);
  assert.equal(result.bathrooms, 1);
  assert.equal(result.areaSqm, 60);
});

test("extracts Cabo House MyHome attributes before prose fallbacks", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_cabohouseproperty");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_cabohouseproperty",
    source.detail,
    source.price_format,
  );

  const html = `
    <html>
      <body>
        <div class="mh-estate__section mh-estate__section--attributes">
          <ul class="mh-estate__list__inner">
            <li id="mh-estate_attribute--25" class="mh-estate__list__element">
              <strong>m2:</strong>
              70,57
            </li>
            <li id="mh-estate_attribute--5" class="mh-estate__list__element">
              <strong><i class="flaticon-bed"></i></strong>
              2
            </li>
            <li id="mh-estate_attribute--7" class="mh-estate__list__element">
              <strong><i class="flaticon-bath-2"></i></strong>
              1
            </li>
          </ul>
        </div>
        <div class="mh-estate__section mh-estate__section--description">
          <p>A private balcony of approximately 7 m².</p>
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(
    html,
    "https://www.cabohouseproperty.com/properties/apartments/sale/2/example",
  );

  assert.equal(result.areaSqm, 71);
  assert.equal(result.bedrooms, 2);
  assert.equal(result.bathrooms, 1);
});

test("ignores plot identifiers before Cabo House sqm values", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_cabohouseproperty");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_cabohouseproperty",
    source.detail,
    source.price_format,
  );

  const html = `
    <html>
      <body>
        <div class="mh-estate__section mh-estate__section--attributes">
          <ul class="mh-estate__list__inner">
            <li id="mh-estate_attribute--25" class="mh-estate__list__element">
              <strong>m2:</strong>
              Plot 441: 157.03 sqm - Plot 442: 160.37 sqm
            </li>
          </ul>
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(
    html,
    "https://www.cabohouseproperty.com/properties/land/sale/ground/example",
  );

  assert.equal(result.areaSqm, 157);
});

test("does not infer whole-building bedrooms or bathrooms from one floor description", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_cabohouseproperty");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(
    "cv_cabohouseproperty",
    source.detail,
    source.price_format,
  );

  const html = `
    <html>
      <body>
        <div class="mh-estate__section mh-estate__section--attributes">
          <ul class="mh-estate__list__inner">
            <li id="mh-estate_attribute--25" class="mh-estate__list__element">
              <strong>m2:</strong>
              470
            </li>
          </ul>
        </div>
        <div class="mh-estate__section mh-estate__section--description">
          <p>The first-floor apartment includes 1 bedroom and 1 bathroom.</p>
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(
    html,
    "https://www.cabohouseproperty.com/properties/building/sale/various-floors/example",
  );

  assert.equal(result.areaSqm, 470);
  assert.equal(result.bedrooms, null);
  assert.equal(result.bathrooms, null);
});

test("falls back to regex when structured bathroom selector is absent", () => {
  const plugin = createGenericDetailPlugin("cv_example", {
    selectors: {
      description: ".contentText",
    },
    spec_patterns: {
      bathrooms: [
        "(\\d+)\\s*(?:Bathrooms?|Baths?)",
      ],
    },
  });

  const html = `
    <html>
      <body>
        <div class="contentText">Spacious apartment with 3 Bathrooms and sea views.</div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://example.com/property/123");

  assert.equal(result.bathrooms, 3);
});

test("uses real-estate JSON-LD as structured fallback and converts SqFt floor size to sqm", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    selectors: {
      description: ".contentText",
      images: ".property-gallery img",
      price: ".property-price",
    },
  }, {
    currency_symbol: "€",
    thousands_separator: ",",
    decimal_separator: ".",
  });

  const html = `
    <html>
      <body>
        <div class="contentText">A seafront apartment with a quiet balcony and secure access.</div>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Apartment",
            "name": "Branco Sea Partial View Apartment",
            "numberOfBedrooms": 1,
            "numberOfBathroomsTotal": 1,
            "floorSize": {
              "@type": "QuantitativeValue",
              "value": 678,
              "unitText": "SqFt"
            },
            "offers": {
              "@type": "Offer",
              "price": 105000,
              "priceCurrency": "USD"
            },
            "image": [
              "https://simplycapeverde.com/wp-content/uploads/2026/02/MG_7619_HDR.jpg",
              "https://simplycapeverde.com/wp-content/uploads/2026/02/MG_7520_HDR.jpg"
            ]
          }
        </script>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://simplycapeverde.com/property/branco-sea-partial-view-apartment-santa-maria-sal");

  assert.equal(result.price, 105000);
  assert.equal(result.bedrooms, 1);
  assert.equal(result.bathrooms, 1);
  assert.equal(result.areaSqm, 63);
  assert.deepEqual(result.imageUrls, [
    "https://simplycapeverde.com/wp-content/uploads/2026/02/MG_7619_HDR.jpg",
    "https://simplycapeverde.com/wp-content/uploads/2026/02/MG_7520_HDR.jpg",
  ]);
});

test("rejects social share and site branding images from detail galleries", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    selectors: {
      images: ".property-gallery img, .property-gallery a",
    },
  });

  const html = `
    <html>
      <body>
        <div class="property-gallery">
          <img src="https://simplycapeverde.com/wp-content/uploads/2026/02/IMG_3633-scaled-1.jpg">
          <a href="https://pinterest.com/pin/create/button">Pin it</a>
          <img src="https://simplycapeverde.com/wp-content/uploads/2023/01/Group-18-Copy.png">
          <img src="https://simplycapeverde.com/wp-content/uploads/2026/02/IMG_3592-scaled-1.jpg">
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://simplycapeverde.com/property/tortuga-resort-2-bed-apartment-hotel-block-with-2-balconies");

  assert.deepEqual(result.imageUrls, [
    "https://simplycapeverde.com/wp-content/uploads/2026/02/IMG_3633-scaled-1.jpg",
    "https://simplycapeverde.com/wp-content/uploads/2026/02/IMG_3592-scaled-1.jpg",
  ]);
});

test("parses ShortPixel srcset URLs without splitting CDN parameters into junk images", () => {
  const plugin = createGenericDetailPlugin("cv_homescasaverde", {
    selectors: {
      images: ".property-detail-gallery img",
    },
  });

  const html = `
    <html>
      <body>
        <div class="property-detail-gallery">
          <img
            src="https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/cover-584x438.jpg"
            srcset="https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/cover-584x438.jpg 584w, https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/cover-2048x1536.jpg 2048w"
          >
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.homescasaverde.com/property/example");

  assert.deepEqual(result.imageUrls, [
    "https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/cover-2048x1536.jpg",
  ]);
});

test("converts SqFt area values extracted from spec tables", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    spec_table: {
      container: ".property-overview",
      label_selector: ".hz-meta-label",
      label_map: {
        area: ["area size"],
      },
    },
  });

  const html = `
    <html>
      <body>
        <ul class="property-overview">
          <li><strong>839</strong><span class="hz-meta-label">Area Size</span><span>Sq Ft</span></li>
        </ul>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://simplycapeverde.com/property/2-bedroom-apartment-for-sale-in-santa-maria");

  assert.equal(result.areaSqm, 78);
});

test("extracts spec-table values from previous sibling labels used by Homes Casa Verde overview", () => {
  const plugin = createGenericDetailPlugin("cv_homescasaverde", {
    spec_table: {
      container: ".property-overview-data",
      label_selector: ".hz-meta-label",
      label_map: {
        area: ["area size"],
      },
    },
  });

  const html = `
    <html>
      <body>
        <ul class="property-overview-data">
          <li>151.75 m²</li>
          <li class="h-area-sizes hz-meta-label">Area Size</li>
        </ul>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.homescasaverde.com/property/vila-verde-townhouse-with-pool-views-yucca");

  assert.equal(result.areaSqm, 152);
});

test("keeps structured area when later description text contains other area values", () => {
  const plugin = createGenericDetailPlugin("cv_homescasaverde", {
    selectors: {
      description: ".property-description",
    },
    spec_table: {
      container: ".property-overview-data",
      label_selector: ".hz-meta-label",
      label_map: {
        area: ["area size"],
      },
    },
    spec_patterns: {
      area: [
        "(\\d+(?:[.,]\\d+)?)\\s*(?:m[²2]|sqm|sq\\.?\\s*m)",
      ],
    },
  });

  const html = `
    <html>
      <body>
        <ul class="property-overview-data">
          <li>859 m²</li>
          <li class="h-area-sizes hz-meta-label">Area Size</li>
        </ul>
        <div class="property-description">
          On a 544m² corner plot with new road access, the building offers flexible accommodation.
        </div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.homescasaverde.com/property/entire-building-for-sale");

  assert.equal(result.areaSqm, 859);
});

test("keeps structured sqm area when JSON-LD floorSize mislabels the same value as SQFT", () => {
  const plugin = createGenericDetailPlugin("cv_homescasaverde", {
    spec_table: {
      container: ".property-overview-data",
      label_selector: ".hz-meta-label",
      label_map: {
        area: ["area size"],
      },
    },
  });

  // Houzez emits the on-page square-meter figure in JSON-LD but mislabels the
  // unit as "SQFT". The structured "87.41 m²" overview value must win, not the
  // bogus SqFt conversion (87.41 * 0.0929 -> 8).
  const html = `
    <html>
      <body>
        <ul class="property-overview-data">
          <li><strong>87.41 m²</strong></li>
          <li class="h-area-sizes hz-meta-label">Area Size</li>
        </ul>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Apartment",
            "name": "2 Bed, 2 Bath Penthouse In Melia Tortuga",
            "floorSize": {
              "@type": "QuantitativeValue",
              "value": 87.41,
              "unitText": "SQFT"
            }
          }
        </script>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://www.homescasaverde.com/property/2-bed-2-bath-penthouse-in-melia-tortuga-2");

  assert.equal(result.areaSqm, 87);
});

test("converts SqFt area values extracted from regex patterns", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    selectors: {
      description: ".contentText",
    },
    spec_patterns: {
      area: [
        "(\\d+(?:[.,]\\d+)?)\\s*(?:m[²2]|sqm|sq\\.?\\s*m|sq\\.?\\s*ft|sqft|ft[²2])",
      ],
    },
  });

  const html = `
    <html>
      <body>
        <div class="contentText">The apartment has an internal area of 678 Sq Ft and a private balcony.</div>
      </body>
    </html>
  `;

  const result = plugin.extract(html, "https://simplycapeverde.com/property/beachfront-apartment-for-sale-in-santa-maria-sea-view");

  assert.equal(result.areaSqm, 63);
});

test("parses comma-thousands square-metre values as thousands, not decimals", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    selectors: {
      description: ".property-description",
    },
    spec_patterns: {
      area: [
        "(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:m[²2]|sqm)",
      ],
    },
  });

  const result = plugin.extract(`
    <div class="property-description">
      Set on 20,000 m² (2 hectares) of land near Mindelo.
    </div>
  `, "https://simplycapeverde.com/property/development-opportunity");

  assert.equal(result.areaSqm, 20000);
});

test("Homes Casa Verde keeps the large current-listing gallery image and excludes similar listings", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_homescasaverde");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <div>
      <a href="#" data-src="/wp-content/uploads/2026/06/current-scaled.jpg"
        data-houzez-fancybox data-fancybox="gallery-v2">
        <img src="https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/current-scaled.jpg">
      </a>
    </div>
    <div class="similar-listings">
      <img class="wp-post-image" src="https://www.homescasaverde.com/wp-content/uploads/2026/06/other-property.jpg">
    </div>
  `, "https://www.homescasaverde.com/property/current");

  assert.deepEqual(result.imageUrls, [
    "https://www.homescasaverde.com/wp-content/uploads/2026/06/current-scaled.jpg",
  ]);
});

test("EstateCV ignores unrelated page uploads and keeps property gallery images", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <header>
      <img src="https://estatecv.com/wp-content/uploads/2024/08/office-team-1200x800.jpg">
    </header>
    <div class="gallery">
      <img class="gallery__img"
        src="https://estatecv.com/wp-content/uploads/2024/09/unit-445x331.jpg"
        srcset="https://estatecv.com/wp-content/uploads/2024/09/unit-445x331.jpg 445w,
                https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg 1440w">
    </div>
  `, "https://estatecv.com/en/properties/apartments/unit");

  assert.deepEqual(result.imageUrls, [
    "https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg",
  ]);
});

test("Homes Casa Verde extracts the detail address block for city recovery", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_homescasaverde");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <div class="property-address">
      <ul>
        <li>City: Santa Maria</li>
        <li>State/county: Sal</li>
        <li>Area: Vila Verde</li>
      </ul>
    </div>
  `, "https://www.homescasaverde.com/property/vila-verde");

  assert.match(result.location, /Santa Maria/);
  assert.match(result.location, /Sal/);
});

test("Simply Cape Verde extracts Land from the Houzez property-type row", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_simplycapeverde");
  assert.ok(source);

  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <ul class="property-overview-data">
      <li><strong>20,000 m²</strong><span class="hz-meta-label">Land Area</span></li>
      <li><strong>Land</strong><span class="hz-meta-label">Property Type</span></li>
    </ul>
  `, "https://simplycapeverde.com/property/development-opportunity");

  assert.equal(result.areaSqm, 20000);
  assert.equal(result.propertyType, "land");
});
