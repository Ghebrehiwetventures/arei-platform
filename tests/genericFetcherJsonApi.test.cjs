const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { mapJsonItem } = require("../core/fetcher");

test("json_api mapping can pick an English title from a typed description array", () => {
  const raw = {
    content: {
      MLSID: "730061001-16",
      NumberOfBedrooms: null,
      City: "Santa Maria",
      Province: "SAL",
      ListingPriceEuro: 200000,
      ListingDescriptions: [
        { DescriptionTypeUID: "629", ISOLanguageCode: "pt", Description: "Long Portuguese body" },
        { DescriptionTypeUID: "1113", ISOLanguageCode: "pt", Description: "Terreno em Santa Maria" },
        { DescriptionTypeUID: "629", ISOLanguageCode: "en", Description: "Long English body" },
        { DescriptionTypeUID: "1113", ISOLanguageCode: "en", Description: "Land plot in Santa Maria" },
      ],
      ShortLinks: [
        {
          ShortLink: "en/listings/land/for-sale/santa-maria/730061001-16",
          ISOLanguageCode: "en",
        },
      ],
      ListingImages: [
        { FileName: "L_example.jpg" },
      ],
    },
  };

  const listing = mapJsonItem(raw, {
    id: "cv_remax",
    name: "REMAX Cape Verde",
    base_url: "https://www.remax.cv/search/listing-search/docs/search",
    pagination: { type: "json_api" },
    selectors: {},
    delay_ms: 0,
    jitter_ms: 0,
    max_items: 10,
    max_pages: 1,
    stop_condition: "empty_listings",
    reject_url_patterns: [],
    fetch_method: "http",
    cms_type: "custom",
    id_prefix: "rmx",
    item_map: {
      content_base: "content",
      id: "MLSID",
      title: {
        array: "ListingDescriptions",
        field: "Description",
        matches: [
          { field: "ISOLanguageCode", equals: "en" },
          { field: "DescriptionTypeUID", equals: "1113" },
        ],
      },
      price: "ListingPriceEuro",
      location_template: "{City}, {Province}",
      detail_url: {
        array: "ShortLinks",
        field: "ShortLink",
        match_field: "ISOLanguageCode",
        match_value: "en",
        template: "https://www.remax.cv/{VALUE}",
      },
      images: {
        array: "ListingImages",
        field: "FileName",
        template: "https://cdn.gryphtech.com/userimages/73/LargeWM/{VALUE}",
        limit: 10,
      },
    },
  }, new Date("2026-05-20T00:00:00.000Z"));

  assert.equal(listing.title, "Land plot in Santa Maria");
  assert.equal(listing.id, "rmx_730061001-16");
  assert.equal(listing.detailUrl, "https://www.remax.cv/en/listings/land/for-sale/santa-maria/730061001-16");
});

test("json_api mapping uses ordered title fallbacks when the preferred title is missing", () => {
  const raw = {
    content: {
      MLSID: "730061001-53",
      City: "Santa Maria",
      Province: "SAL",
      ListingPriceEuro: 180000,
      ListingDescriptions: [
        { DescriptionTypeUID: "1113", ISOLanguageCode: "pt", Description: "Apartamento T2" },
      ],
      ListingMetaTags: [
        {
          LanguageCode: "en-US",
          MetaTitle: "Condo/Apartment For Sale, 2 Bedrooms located at Santa Maria, SAL, SAL | Cape Verde",
        },
      ],
    },
  };

  const listing = mapJsonItem(raw, {
    id: "cv_remax",
    name: "REMAX Cape Verde",
    base_url: "https://www.remax.cv/search/listing-search/docs/search",
    pagination: { type: "json_api" },
    selectors: {},
    delay_ms: 0,
    jitter_ms: 0,
    max_items: 10,
    max_pages: 1,
    stop_condition: "empty_listings",
    reject_url_patterns: [],
    fetch_method: "http",
    cms_type: "custom",
    id_prefix: "rmx",
    item_map: {
      content_base: "content",
      id: "MLSID",
      title: {
        array: "ListingDescriptions",
        field: "Description",
        matches: [
          { field: "ISOLanguageCode", equals: "en" },
          { field: "DescriptionTypeUID", equals: "1113" },
        ],
      },
      title_fallbacks: [
        {
          array: "ListingMetaTags",
          field: "MetaTitle",
          match_field: "LanguageCode",
          match_value: "en-US",
        },
      ],
      price: "ListingPriceEuro",
      location_template: "{City}, {Province}",
    },
  }, new Date("2026-05-20T00:00:00.000Z"));

  assert.equal(
    listing.title,
    "Condo/Apartment For Sale, 2 Bedrooms located at Santa Maria, SAL, SAL | Cape Verde",
  );
});
