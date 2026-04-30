// Manual sanity script for the Property Chat Lab assistant.
// Run with:
//   npx tsx scripts/experiments/property-chat-sanity.mts
//
// Exercises the deterministic parser + matcher against a fixture listing pool.
// No network, no Supabase, no LLM.

import {
  respondToPropertyChat,
  parseBuyerIntent,
  type ChatState,
} from "../../arei-admin/assistant/index.ts";
import type { Listing } from "../../arei-admin/types.ts";

const FIXTURES: Listing[] = [
  {
    id: "1",
    title: "Modern 2-bed apartment in Santa Maria, Sal",
    price: 180_000,
    currency: "EUR",
    images: ["https://example.com/a.jpg"],
    sourceId: "cv_kazaverde",
    sourceName: "KazaVerde",
    sourceUrl: "https://example.com/listing/1",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: 2,
    bathrooms: 1,
    area_sqm: 85,
    property_type: "apartment",
    approved: true,
    description: "Sea view, 5 minutes from the beach.",
  },
  {
    id: "2",
    title: "Beachfront villa Boa Vista",
    price: 480_000,
    currency: "EUR",
    images: ["https://example.com/b.jpg"],
    sourceId: "cv_capeverdeproperty",
    sourceName: "CapeVerdeProperty",
    sourceUrl: "https://example.com/listing/2",
    island: "Boa Vista",
    city: "Sal Rei",
    bedrooms: 4,
    bathrooms: 3,
    area_sqm: 220,
    property_type: "villa",
    approved: true,
    description: "Direct beachfront access, ocean view.",
  },
  {
    id: "3",
    title: "Land plot Santiago - Praia outskirts",
    price: 35_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_classifieds",
    sourceName: "Classifieds CV",
    sourceUrl: "https://example.com/listing/3",
    island: "Santiago",
    city: "Praia",
    bedrooms: null,
    bathrooms: null,
    area_sqm: 600,
    property_type: "land",
    approved: true,
  },
  {
    id: "4",
    title: "Spacious 3-bed apartment Santa Maria",
    price: 240_000,
    currency: "EUR",
    images: ["https://example.com/c.jpg"],
    sourceId: "cv_kazaverde",
    sourceName: "KazaVerde",
    sourceUrl: "https://example.com/listing/4",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 110,
    property_type: "apartment",
    approved: true,
    description: "Sea view balcony, pool in the building.",
  },
  // Missing-price land in Santiago — must NOT satisfy "land under 100k".
  {
    id: "5",
    title: "Land near the Sea",
    price: undefined,
    currency: "EUR",
    images: [],
    sourceId: "cv_capeverdeproperty24",
    sourceName: "Cape Verde Property 24",
    sourceUrl: "https://example.com/listing/5",
    island: "Santiago",
    city: "Praia",
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    property_type: "land",
    approved: true,
  },
  // Apartment in Santa Maria with NO sqm — must not falsely satisfy 80+ sqm,
  // but should appear as a partial match.
  {
    id: "6",
    title: "Porto Antigo studio Santa Maria",
    price: 104_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_cabohouse",
    sourceName: "Cabo House Property",
    sourceUrl: "https://example.com/listing/6",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: null,
    property_type: "apartment",
    approved: true,
  },
  // House without bedrooms info — must not falsely satisfy minBedrooms.
  {
    id: "7",
    title: "House Mindelo - bedrooms unknown",
    price: 320_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_homescasaverde",
    sourceName: "Homes Casa Verde",
    sourceUrl: "https://example.com/listing/7",
    island: "São Vicente",
    city: "Mindelo",
    bedrooms: null,
    bathrooms: null,
    area_sqm: 180,
    property_type: "house",
    approved: true,
  },
  // High-priced house with known price — should win "most expensive house".
  {
    id: "8",
    title: "Hilltop estate Santiago",
    price: 950_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_estatecv",
    sourceName: "Estate CV",
    sourceUrl: "https://example.com/listing/8",
    island: "Santiago",
    city: "Praia",
    bedrooms: 5,
    bathrooms: 4,
    area_sqm: 400,
    property_type: "house",
    approved: true,
  },
  // House on price-on-request — must NOT win "most expensive house".
  {
    id: "9",
    title: "Mystery mansion - price on request",
    price: undefined,
    currency: "EUR",
    images: [],
    sourceId: "cv_amicv",
    sourceName: "AMICV",
    sourceUrl: "https://example.com/listing/9",
    island: "Santiago",
    city: "Praia",
    bedrooms: 6,
    bathrooms: 5,
    area_sqm: 500,
    property_type: "house",
    approved: true,
  },
];

const SAMPLES = [
  "I want a 2 bedroom apartment in Sal under 200k",
  "beachfront villa in Boa Vista under 500000",
  "cheap land in Santiago",
  "apartment in Santa Maria with at least 80 sqm",
  "only sea view",
  "show cheaper ones",
  "what about Boa Vista instead?",
  "send me the links",
];

function runOneShotParserSamples() {
  console.log("=== Parser samples ===");
  for (const m of SAMPLES) {
    const r = parseBuyerIntent(m);
    console.log(`> ${m}`);
    console.log("  intent:", r.intent);
    console.log("  actions:", r.actions, "modifiers:", r.modifiers);
    console.log("  replacements:", r.replacements);
  }
}

function runFlow(label: string, script: string[]) {
  console.log(`\n=== Flow ${label} ===`);
  let state: ChatState = {
    intent: { keywords: [] },
    lastMatches: [],
    turns: [],
  };
  for (const m of script) {
    const out = respondToPropertyChat({
      message: m,
      state,
      listings: FIXTURES,
    });
    state = out.state;
    console.log(`> ${m}`);
    console.log(`  assistant: ${out.reply.text}`);
    if (out.reply.matches?.length) {
      for (const match of out.reply.matches) {
        const price = match.listing.price != null ? `€${match.listing.price}` : "Price on request";
        console.log(
          `   • [${match.confidence}] ${match.listing.title}  [score=${match.score.toFixed(2)}, ${price}]`
        );
        if (match.unknownFields.length) {
          console.log(`        missing: ${match.unknownFields.join(", ")}`);
        }
      }
    }
    console.log("  intent:", state.intent);
  }
  return state;
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${msg}`);
  }
}

function runRegressions() {
  console.log("\n=== Regressions ===");

  // R1: missing price must not satisfy maxPrice as strong match.
  {
    const out = respondToPropertyChat({
      message: "land under 100k in Santiago",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const m = out.reply.matches ?? [];
    const priceUnknown = m.find((x) => x.listing.price == null);
    if (priceUnknown) {
      assert(priceUnknown.confidence !== "strong",
        "R1: price-on-request land is not a strong match for 'land under 100k'");
      assert(!priceUnknown.reasons.some((r) => r.includes("under €")),
        "R1: price-on-request listing does NOT claim 'under €100k' as a reason");
    } else {
      assert(true, "R1: only priced listings shown for 'under 100k' query");
    }
    // The €35k Santiago land should be present and strong.
    const priced = m.find((x) => x.listing.id === "3");
    assert(priced?.confidence === "strong",
      "R1: priced €35k Santiago land is a strong match");
  }

  // R2: missing sqm must not satisfy minSizeSqm.
  {
    const out = respondToPropertyChat({
      message: "apartment in Santa Maria with at least 80 sqm",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const m = out.reply.matches ?? [];
    const studioWithoutSqm = m.find((x) => x.listing.id === "6");
    if (studioWithoutSqm) {
      assert(studioWithoutSqm.confidence !== "strong",
        "R2: apartment without sqm is not strong for '80+ sqm'");
      assert(!studioWithoutSqm.reasons.some((r) => /sqm$/.test(r)),
        "R2: apartment without sqm does NOT claim a sqm reason");
    }
    const apt85 = m.find((x) => x.listing.id === "1");
    assert(apt85?.confidence === "strong",
      "R2: apartment with 85 sqm is a strong match");
  }

  // R3: missing bedrooms must not satisfy minBedrooms.
  {
    const out = respondToPropertyChat({
      message: "3 bedroom house in São Vicente",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const m = out.reply.matches ?? [];
    const houseUnknownBeds = m.find((x) => x.listing.id === "7");
    if (houseUnknownBeds) {
      assert(houseUnknownBeds.confidence !== "strong",
        "R3: house with unknown bedrooms is not strong for '3+ bed'");
      assert(!houseUnknownBeds.reasons.some((r) => /-bed$/.test(r)),
        "R3: house with unknown bedrooms does NOT claim a bed reason");
    }
  }

  // R4: "most expensive house" excludes price-on-request.
  {
    const out = respondToPropertyChat({
      message: "send me link to the most expensive house",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const m = out.reply.matches ?? [];
    assert(m.length === 1, "R4: selector returned exactly one result");
    assert(m[0]?.listing.id === "8",
      "R4: most expensive house is the priced €950k Hilltop estate, not the price-on-request mansion");
    assert(out.reply.text.toLowerCase().includes("link"),
      "R4: reply contains a link");
  }

  // R5: new_search resets old constraints (the chaos bug from real usage).
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "I want a 2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const out = respondToPropertyChat({
      message: "cheap land in Santiago",
      state, listings: FIXTURES,
    });
    const ni = out.state.intent;
    assert(ni.propertyType === "land", "R5: new search switched to land");
    assert(ni.island === "Santiago", "R5: new search switched to Santiago");
    assert(ni.minBedrooms == null, "R5: new search dropped minBedrooms (land has none)");
    assert(ni.maxPrice == null, "R5: new search dropped prior maxPrice");
    assert(!ni.keywords?.length || ni.keywords.length === 0, "R5: new search dropped prior keywords");
    assert(ni.city == null, "R5: new search dropped prior city");
    assert(ni.minSizeSqm == null, "R5: new search dropped prior minSizeSqm");
  }

  // R6: repeated full search is idempotent (does not tighten budget).
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "cheap land in Santiago",
      state, listings: FIXTURES,
    }).state;
    const firstMaxPrice = state.intent.maxPrice;
    state = respondToPropertyChat({
      message: "cheap land in Santiago",
      state, listings: FIXTURES,
    }).state;
    assert(state.intent.maxPrice === firstMaxPrice,
      "R6: repeating 'cheap land in Santiago' does not tighten maxPrice");
  }

  // R7: partial matches are labeled when included.
  {
    const out = respondToPropertyChat({
      message: "apartment in Santa Maria with at least 80 sqm",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const text = out.reply.text;
    const matches = out.reply.matches ?? [];
    const hasPartial = matches.some((x) => x.confidence !== "strong");
    if (hasPartial) {
      assert(/partial|missing/i.test(text),
        "R7: copy mentions partial/missing when partial matches are included");
    } else {
      assert(true, "R7: no partial matches present, no warning needed");
    }
  }

  // R8: island change in refinement drops incompatible city.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "apartment in Santa Maria with at least 80 sqm",
      state, listings: FIXTURES,
    }).state;
    state = respondToPropertyChat({
      message: "what about Boa Vista instead?",
      state, listings: FIXTURES,
    }).state;
    assert(state.intent.island === "Boa Vista",
      "R8: refinement replaced island");
    assert(state.intent.city == null,
      "R8: refinement dropped prior incompatible city Santa Maria");
  }
}

runOneShotParserSamples();

runFlow("A — refine + cheaper + links", [
  "I want a 2 bedroom apartment in Sal under 200k",
  "only sea view",
  "show cheaper ones",
  "send me the links",
]);

runFlow("B — cheap land, replace island, bigger", [
  "cheap land in Santiago",
  "what about Boa Vista instead?",
  "show bigger ones",
]);

runFlow("C — vague intent, expect clarifying question", [
  "I want to buy property",
]);

runFlow("D — replace property type", [
  "apartment in Santa Maria with at least 80 sqm",
  "what about villas?",
]);

runFlow("E — concrete query, expect match or clear no-match", [
  "beachfront villa in Boa Vista under 500000",
]);

runFlow("F — new_search after prior search resets state", [
  "I want a 2 bedroom apartment in Sal under 200k",
  "cheap land in Santiago",
]);

runFlow("G — selector + send_links: most expensive house", [
  "send me link to the most expensive house",
]);

runRegressions();
