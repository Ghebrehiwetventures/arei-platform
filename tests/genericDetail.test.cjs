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
