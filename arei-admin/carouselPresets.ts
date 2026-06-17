// carouselPresets.ts — campaign/content concepts for the Social Carousel
// Builder. Adding a new concept = one entry here; the builder reads the preset
// for its defaults, so concepts are no longer hardcoded to "What €100k buys".

export interface CarouselPreset {
  id: string;
  name: string;
  mode?: "carousel" | "single"; // "single" = one-listing spotlight (default carousel)
  coverTitle: string;
  coverKicker: string;
  cta: string;
  listingsRequired: boolean; // must the deck include listing slides?
  defaultListings: number;   // how many listings to auto-pick (0 = none)
  priceCap?: number;         // seed the price cap when relevant
  allowMoment: boolean;      // World Cup / "the moment" framing allowed?
  captionAngle: string;      // one-line caption angle for this concept
}

export const PRESETS: CarouselPreset[] = [
  {
    id: "what-100k",
    name: "What €100 000 buys in Cape Verde",
    coverTitle: "3 homes under €100 000",
    coverKicker: "// CABO VERDE · WORLD CUP",
    cta: "See source-linked listings from across Cape Verde.",
    listingsRequired: true,
    defaultListings: 3,
    priceCap: 100000,
    allowMoment: true,
    captionAngle: "Everyone is looking at Cape Verde. We track what property actually costs there.",
  },
  {
    id: "single-listing",
    name: "Single listing spotlight",
    mode: "single",
    coverTitle: "Source-linked listing from the Cape Verde Real Estate Index",
    coverKicker: "// SOURCE-LINKED LISTING",
    cta: "View the source-linked listing",
    listingsRequired: true,
    defaultListings: 1,
    priceCap: 1000000,
    allowMoment: false,
    captionAngle: "Source-linked listing from the Cape Verde Real Estate Index.",
  },
  {
    id: "5-under-100k",
    name: "5 homes under €100 000",
    coverTitle: "5 homes under €100 000",
    coverKicker: "// FROM THE INDEX",
    cta: "Follow real listings. Understand the market.",
    listingsRequired: true,
    defaultListings: 5,
    priceCap: 100000,
    allowMoment: false,
    captionAngle: "Five real, source-linked homes under €100 000 — indexed from across Cape Verde.",
  },
  {
    id: "what-200k",
    name: "What €200 000 buys in Cape Verde",
    coverTitle: "What €200 000 buys in Cape Verde",
    coverKicker: "// FROM THE INDEX",
    cta: "See source-linked listings from across Cape Verde.",
    listingsRequired: true,
    defaultListings: 3,
    priceCap: 200000,
    allowMoment: false,
    captionAngle: "What €200 000 actually buys in Cape Verde — real, source-linked listings.",
  },
  {
    id: "market-explained",
    name: "Cape Verde property market, explained",
    coverTitle: "The Cape Verde property market, explained",
    coverKicker: "// THE INDEX",
    cta: "Track the Cape Verde property market.",
    listingsRequired: false,
    defaultListings: 0,
    allowMoment: false,
    captionAngle: "How the Cape Verde property market actually works — organized, source-linked, indexed.",
  },
  {
    id: "moment",
    name: "Cape Verde is having a moment",
    coverTitle: "Cape Verde is having a moment",
    coverKicker: "// THE MOMENT",
    cta: "Follow real listings. Understand the market.",
    listingsRequired: false,
    defaultListings: 0,
    allowMoment: true,
    captionAngle: "The world just discovered Cape Verde. Here's the market behind the moment.",
  },
  {
    id: "watchlist",
    name: "Get the Cape Verde Property Watchlist",
    coverTitle: "Get the Cape Verde Property Watchlist",
    coverKicker: "// THE INDEX",
    cta: "Get the Cape Verde Property Watchlist.",
    listingsRequired: false,
    defaultListings: 0,
    allowMoment: false,
    captionAngle: "Track real, source-linked Cape Verde listings in one place.",
  },
];

// CTA headline presets — conversion-oriented, not stiff.
export const CTA_PRESETS = [
  "View the source-linked listing",
  "Track the Cape Verde property market.",
  "Get the Cape Verde Property Watchlist.",
  "Follow real listings. Understand the market.",
  "See source-linked listings from across Cape Verde.",
  "See what it actually costs.",
];

// Listing-card label — index language, not broker language ("FOR SALE").
export const LISTING_LABELS = ["INDEXED LISTING", "LISTING SNAPSHOT", "SOURCE-LINKED LISTING", "FROM THE INDEX"];

// Non-broker disclosure, added to captions + metadata.
export const DISCLOSURE =
  "Cape Verde Real Estate Index is not a broker. We organize public, source-linked listings to make the market easier to understand.";

// Stronger disclosure for single-listing spotlights (the listing + its image
// belong to the original source; we're a discovery layer, not the owner).
export const SINGLE_DISCLOSURE =
  "CVREI is not a broker and does not own this listing or image. Listing information and images remain with the original source. We organize public, source-linked listings to make the market easier to understand.";

// Plural form for carousels that use multiple listing photos.
export const DISCLOSURE_LISTINGS =
  "CVREI is not a broker and does not own these listings or images. Listing information and images remain with their original sources. We organize public, source-linked listings to make the market easier to understand.";
