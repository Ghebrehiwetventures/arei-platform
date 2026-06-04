const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { createGenericDetailPlugin } = require("../core/detail/plugins/genericDetail");

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
