// Manual sanity script for the Property Chat Lab assistant.
// Run with:
//   npx tsx scripts/experiments/property-chat-sanity.mts
//
// Exercises the deterministic parser + matcher against a fixture listing pool.
// No network, no Supabase, no LLM.

import {
  respondToPropertyChat,
  parseBuyerIntent,
  classifyMessage,
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
  // Extreme apartment outlier — should not lead broad holiday apartment search.
  {
    id: "10",
    title: "Ultra luxury apartment in Sal",
    price: 3_120_000,
    currency: "EUR",
    images: ["https://example.com/lux.jpg"],
    sourceId: "cv_luxury",
    sourceName: "Luxury CV",
    sourceUrl: "https://example.com/listing/10",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: 4,
    bathrooms: 4,
    area_sqm: 280,
    property_type: "apartment",
    approved: true,
    description: "Large premium apartment.",
  },
  // Missing property_type, but title clearly says apartment. Must not appear
  // as a land partial just because the structured type is missing.
  {
    id: "11",
    title: "DuarGema, House of Diaspora - B13 Apartment T1",
    price: 59_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_duargema",
    sourceName: "DuarGema",
    sourceUrl: "https://example.com/listing/11",
    island: "Santiago",
    city: "Praia",
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 48,
    approved: true,
    description: "Apartment record with sparse source metadata.",
  },
  // Missing property_type records with obvious title contradictions for villa.
  {
    id: "12",
    title: "Sea View Apartment",
    price: 165_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_boa",
    sourceName: "Boa Vista Source",
    sourceUrl: "https://example.com/listing/12",
    island: "Boa Vista",
    city: "Sal Rei",
    bedrooms: 2,
    bathrooms: 1,
    area_sqm: 82,
    approved: true,
    description: "Sea view apartment close to the beach.",
  },
  {
    id: "13",
    title: "BUILDING PLOT ON THE BEACH",
    price: 120_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_boa",
    sourceName: "Boa Vista Source",
    sourceUrl: "https://example.com/listing/13",
    island: "Boa Vista",
    city: "Sal Rei",
    bedrooms: null,
    bathrooms: null,
    area_sqm: 300,
    approved: true,
    description: "Plot with beach access.",
  },
  {
    id: "14",
    title: "BUILDING LAND CLOSE TO PRAIA DO ESTORIL BEACH 300 m2",
    price: 95_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_boa",
    sourceName: "Boa Vista Source",
    sourceUrl: "https://example.com/listing/14",
    island: "Boa Vista",
    city: "Sal Rei",
    bedrooms: null,
    bathrooms: null,
    area_sqm: 300,
    approved: true,
    description: "Building land near Praia do Estoril.",
  },
  // Commercial title should not appear for apartment searches.
  {
    id: "15",
    title: "Negozio in Santa Maria",
    price: 50_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_commercial",
    sourceName: "Commercial CV",
    sourceUrl: "https://example.com/listing/15",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: null,
    bathrooms: 1,
    area_sqm: 35,
    approved: true,
    description: "Small shop unit.",
  },
  // Sparse source record without a contradicting title can still be partial.
  {
    id: "16",
    title: "Affordable unit in Santa Maria",
    price: 95_000,
    currency: "EUR",
    images: [],
    sourceId: "cv_sparse",
    sourceName: "Sparse Source",
    sourceUrl: "https://example.com/listing/16",
    island: "Sal",
    city: "Santa Maria",
    bedrooms: 2,
    bathrooms: 1,
    area_sqm: 72,
    approved: true,
    description: "Sparse source record with no property type.",
  },
];

const SAMPLES = [
  "I want a 2 bedroom apartment in Sal under 200k",
  "beachfront villa in Boa Vista under 500000",
  "cheap land in Santiago",
  "I want something near the beach",
  "show me the good stuff",
  "apartment in Santa Maria with at least 80 sqm",
  "only sea view",
  "show cheaper ones",
  "show more",
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

function matchIds(state: ChatState): string {
  return state.lastMatches.map((m) => m.listing.id).join(",");
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

  // R9: foreign-buyer support does not trigger listing cards or mutate state.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const beforeIntent = JSON.stringify(state.intent);
    const beforeMatches = matchIds(state);
    const parsed = parseBuyerIntent("Can foreigners buy property in Cape Verde?");
    assert(classifyMessage(parsed, state.intent) === "buyer_support",
      "R9: foreign-buyer question classifies as buyer_support");
    const out = respondToPropertyChat({
      message: "Can foreigners buy property in Cape Verde?",
      state, listings: FIXTURES,
    });
    assert(!out.reply.matches?.length,
      "R9: foreign-buyer support returns no listing cards");
    assert(JSON.stringify(out.state.intent) === beforeIntent,
      "R9: foreign-buyer support does not mutate intent");
    assert(matchIds(out.state) === beforeMatches,
      "R9: foreign-buyer support preserves lastMatches");
  }

  // R10: agent-contact support does not trigger listing cards.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const parsed = parseBuyerIntent("Can you help me contact the agent?");
    assert(classifyMessage(parsed, state.intent) === "buyer_support",
      "R10: agent-contact question classifies as buyer_support");
    const out = respondToPropertyChat({
      message: "Can you help me contact the agent?",
      state, listings: FIXTURES,
    });
    assert(!out.reply.matches?.length,
      "R10: agent-contact support returns no listing cards");
  }

  // R11: legal support does not trigger listing cards.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const parsed = parseBuyerIntent("I need a lawyer before buying");
    assert(classifyMessage(parsed, state.intent) === "buyer_support",
      "R11: lawyer question classifies as buyer_support");
    const out = respondToPropertyChat({
      message: "I need a lawyer before buying",
      state, listings: FIXTURES,
    });
    assert(!out.reply.matches?.length,
      "R11: lawyer support returns no listing cards");
  }

  // R12: links still use previous matches after a buyer-support turn.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const firstLink = state.lastMatches[0]?.listing.sourceUrl;
    state = respondToPropertyChat({
      message: "Can foreigners buy property in Cape Verde?",
      state, listings: FIXTURES,
    }).state;
    const out = respondToPropertyChat({
      message: "send me the links",
      state, listings: FIXTURES,
    });
    assert(firstLink != null && out.reply.text.includes(firstLink),
      "R12: send links still returns previous listing links after support");
    assert(!out.reply.matches?.length,
      "R12: send links action does not render listing cards");
  }

  // R13: area guidance does not trigger listing cards by default.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const beforeIntent = JSON.stringify(state.intent);
    const beforeMatches = matchIds(state);
    const parsed = parseBuyerIntent("What are the best areas in Boa Vista?");
    assert(classifyMessage(parsed, state.intent) === "area_guidance",
      "R13: best areas question classifies as area_guidance");
    const out = respondToPropertyChat({
      message: "What are the best areas in Boa Vista?",
      state, listings: FIXTURES,
    });
    assert(!out.reply.matches?.length,
      "R13: area guidance returns no listing cards");
    assert(JSON.stringify(out.state.intent) === beforeIntent,
      "R13: area guidance does not mutate intent");
    assert(matchIds(out.state) === beforeMatches,
      "R13: area guidance preserves lastMatches");
  }

  // R14: priced holiday apartment search should not rank extreme outlier first.
  {
    const out = respondToPropertyChat({
      message: "I want a holiday apartment in Sal under 4m",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const m = out.reply.matches ?? [];
    assert(m.length > 0,
      "R14: holiday apartment search returns matches");
    assert(m[0]?.listing.id !== "10",
      "R14: priced holiday apartment search does not rank the €3.12M outlier first");
    assert(!m[0]?.reasons.includes("highest price among matches"),
      "R14: priced holiday apartment search is not using most-expensive selector ranking");
  }

  // R15: missing property_type cannot make an obvious apartment a land partial.
  {
    const out = respondToPropertyChat({
      message: "cheap land in Santiago",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const ids = new Set((out.reply.matches ?? []).map((x) => x.listing.id));
    assert(!ids.has("11"),
      "R15: Apartment T1 with missing property_type is excluded from land matches");
  }

  // R16: missing property_type cannot make obvious apartments/plots villa partials.
  {
    const out = respondToPropertyChat({
      message: "beachfront villa in Boa Vista under 500000",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const ids = new Set((out.reply.matches ?? []).map((x) => x.listing.id));
    assert(!ids.has("12"),
      "R16: Sea View Apartment is excluded from villa matches");
    assert(!ids.has("13"),
      "R16: BUILDING PLOT ON THE BEACH is excluded from villa matches");
    assert(!ids.has("14"),
      "R16: BUILDING LAND near Estoril is excluded from villa matches");
  }

  // R17: commercial/shop-like records should not appear for apartment searches.
  {
    const out = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const ids = new Set((out.reply.matches ?? []).map((x) => x.listing.id));
    assert(!ids.has("15"),
      "R17: Negozio/shop record is excluded from apartment matches");
  }

  // R18: sparse missing-type records can still be partial when not contradictory.
  {
    const out = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    const sparse = (out.reply.matches ?? []).find((x) => x.listing.id === "16");
    assert(sparse?.confidence === "partial",
      "R18: non-contradictory missing-property-type record remains a partial match");
    assert(sparse?.unknownFields.includes("property_type") === true,
      "R18: sparse partial is labeled as missing property_type");
  }

  // R19: repeated cheaper refinements should not degrade into weak partials.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const beforeIntent = JSON.stringify(state.intent);
    const beforeMatches = matchIds(state);
    const out = respondToPropertyChat({
      message: "show cheaper ones",
      state, listings: FIXTURES,
    });
    assert(/I don't have good cheaper apartment matches/.test(out.reply.text),
      "R19: weak-only cheaper result gets a guardrail response");
    assert(!out.reply.matches?.length,
      "R19: weak-only cheaper result renders no listing cards");
    assert(JSON.stringify(out.state.intent) === beforeIntent,
      "R19: weak-only cheaper result does not mutate the last good intent");
    assert(matchIds(out.state) === beforeMatches,
      "R19: weak-only cheaper result preserves last good matches");

    const out2 = respondToPropertyChat({
      message: "show cheaper ones",
      state: out.state, listings: FIXTURES,
    });
    assert(!out2.reply.matches?.length,
      "R19: repeated cheaper guard still renders no listing cards");
    assert(matchIds(out2.state) === beforeMatches,
      "R19: repeated cheaper guard keeps prior links available");

    const links = respondToPropertyChat({
      message: "send me the links",
      state: out2.state, listings: FIXTURES,
    });
    assert(links.reply.text.includes("https://example.com/listing/1"),
      "R19: send links still uses the last good cheaper-search matches");
  }

  // R20: broad holiday apartment search asks for budget before cards.
  {
    const out = respondToPropertyChat({
      message: "I want a holiday apartment in Sal",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert(/budget range/i.test(out.reply.text),
      "R20: broad holiday apartment search asks for budget");
    assert(!out.reply.matches?.length,
      "R20: broad holiday apartment search returns no cards");
  }

  // R21: beach-only intent asks which island first.
  {
    const out = respondToPropertyChat({
      message: "I want something near the beach",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert(/which island/i.test(out.reply.text),
      "R21: beach-only query asks which island to focus on");
    assert(!out.reply.matches?.length,
      "R21: beach-only query returns no cards");
  }

  // R22: vague buy-property intent asks for purpose.
  {
    const out = respondToPropertyChat({
      message: "I want to buy property",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert(/holiday home|investment|somewhere to live/i.test(out.reply.text),
      "R22: vague buy-property query asks for purpose");
    assert(!out.reply.matches?.length,
      "R22: vague buy-property query returns no cards");
  }

  // R23: "good stuff" asks what kind of good instead of dumping cards.
  {
    const out = respondToPropertyChat({
      message: "show me the good stuff",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert(/best value|sea view|beachfront|lowest price|investment/i.test(out.reply.text),
      "R23: good-stuff query asks a clarification");
    assert(!out.reply.matches?.length,
      "R23: good-stuff query returns no cards");
  }

  // R24: specific search still returns listing cards.
  {
    const out = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert((out.reply.matches ?? []).length > 0,
      "R24: specific apartment search returns cards");
  }

  // R25: default card count is 3 and card replies include a next-step prompt.
  {
    const out = respondToPropertyChat({
      message: "apartment in Santa Maria with at least 80 sqm",
      state: { intent: { keywords: [] }, lastMatches: [], turns: [] },
      listings: FIXTURES,
    });
    assert((out.reply.matches ?? []).length === 3,
      "R25: default listing-card count is 3");
    assert(/show more|links|cheaper options|budget/i.test(out.reply.text),
      "R25: listing-card reply includes a short next-step prompt");
  }

  // R26: show more expands the current intent without resetting search.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    const first = respondToPropertyChat({
      message: "apartment in Santa Maria with at least 80 sqm",
      state, listings: FIXTURES,
    });
    state = first.state;
    const firstIntent = JSON.stringify(state.intent);
    const out = respondToPropertyChat({
      message: "show more",
      state, listings: FIXTURES,
    });
    assert((out.reply.matches ?? []).length > (first.reply.matches ?? []).length,
      "R26: show more returns additional matches from current intent");
    assert((out.reply.matches ?? []).length <= 6,
      "R26: show more is capped at the broader V0 view");
    assert(/broader view/i.test(out.reply.text),
      "R26: show more says this is a broader view");
    assert(JSON.stringify(out.state.intent) === firstIntent,
      "R26: show more does not reset the current intent");
  }

  // R27: send links still works after a qualification turn.
  {
    let state: ChatState = { intent: { keywords: [] }, lastMatches: [], turns: [] };
    state = respondToPropertyChat({
      message: "2 bedroom apartment in Sal under 200k",
      state, listings: FIXTURES,
    }).state;
    const firstLink = state.lastMatches[0]?.listing.sourceUrl;
    const qualified = respondToPropertyChat({
      message: "I want a holiday apartment in Sal",
      state, listings: FIXTURES,
    });
    assert(!qualified.reply.matches?.length,
      "R27: qualification turn after cards returns no cards");
    const links = respondToPropertyChat({
      message: "send me the links",
      state: qualified.state, listings: FIXTURES,
    });
    assert(firstLink != null && links.reply.text.includes(firstLink),
      "R27: send links still uses previous matches after qualification");
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
