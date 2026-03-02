/**
 * Demo data for KazaVerde UI.
 *
 * This file is the ONLY place with mock data. When arei-sdk is wired,
 * replace usages with AREIClient calls. The shapes match ListingCard
 * and ListingDetail from arei-sdk/types.
 */

export interface DemoListing {
  id: string;
  title: string;
  city: string | null;
  island: string;
  price: number | null;
  currency: string;
  image_urls: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  land_area_sqm: number | null;
  property_size_sqm: number | null;
  description: string | null;
  description_html: string | null;
  first_seen_at: string | null;
  source_id: string;
  source_url: string;
  last_seen_at: string | null;
  is_new?: boolean;
  /** gradient placeholder for demo cards without real images */
  _bg: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "1",
    title: "Praia de Chaves Villa",
    city: "Sal Rei",
    island: "Boa Vista",
    price: 320000,
    currency: "EUR",
    image_urls: [],
    bedrooms: 4,
    bathrooms: 3,
    property_type: "Villa",
    land_area_sqm: null,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    source_id: "morabeza-imoveis",
    source_url: "https://example.com/1",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#5B8A72,#1A4A32)",
  },
  {
    id: "2",
    title: "Santa Maria T2",
    city: "Santa Maria",
    island: "Sal",
    price: 185000,
    currency: "EUR",
    image_urls: [],
    bedrooms: 2,
    bathrooms: 1,
    property_type: "Apartment",
    land_area_sqm: null,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: "2025-12-01T00:00:00Z",
    source_id: "sal-properties",
    source_url: "https://example.com/2",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#7AA0B8,#2A5A72)",
  },
  {
    id: "3",
    title: "Plateau Panorama T3",
    city: "Praia",
    island: "Santiago",
    price: 425000,
    currency: "EUR",
    image_urls: [],
    bedrooms: 3,
    bathrooms: 2,
    property_type: "Penthouse",
    land_area_sqm: null,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    source_id: "santiago-realty",
    source_url: "https://example.com/3",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#C48A5A,#7A4A22)",
  },
  {
    id: "4",
    title: "Mindelo Heritage T2",
    city: "Mindelo",
    island: "São Vicente",
    price: 92000,
    currency: "EUR",
    image_urls: [],
    bedrooms: 2,
    bathrooms: 1,
    property_type: "House",
    land_area_sqm: null,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: "2025-11-15T00:00:00Z",
    source_id: "imoveis-cv",
    source_url: "https://example.com/4",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#A08060,#5A4030)",
  },
  {
    id: "5",
    title: "Volcano View Plot",
    city: "São Filipe",
    island: "Fogo",
    price: 78000,
    currency: "EUR",
    image_urls: [],
    bedrooms: null,
    bathrooms: null,
    property_type: "Land",
    land_area_sqm: 800,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: "2026-01-10T00:00:00Z",
    source_id: "fogo-terras",
    source_url: "https://example.com/5",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#D4603A,#7A2818)",
  },
  {
    id: "6",
    title: "Murdeira Bay Resort T1",
    city: "Murdeira",
    island: "Sal",
    price: 155000,
    currency: "EUR",
    image_urls: [],
    bedrooms: 1,
    bathrooms: 1,
    property_type: "Apartment",
    land_area_sqm: null,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    source_id: "sal-properties",
    source_url: "https://example.com/6",
    last_seen_at: new Date().toISOString(),
    _bg: "linear-gradient(145deg,#5A9AB0,#1A5A70)",
  },
];

export const ISLANDS = [
  { name: "Sal", count: 126, bg: "linear-gradient(180deg, #5CB8E6 0%, #3A9AC8 35%, #E8D5A0 36%, #D4C088 50%, #2A8A7A 51%, #1A6A5A 100%)" },
  { name: "Boa Vista", count: 71, bg: "linear-gradient(180deg, #E8A050 0%, #D08030 25%, #C4A060 26%, #B89050 45%, #4A9AB0 46%, #2A7A90 100%)" },
  { name: "Santiago", count: 107, bg: "linear-gradient(180deg, #6AACE0 0%, #4A8CC0 30%, #3A7A4A 31%, #2A6A3A 55%, #5A8A5A 56%, #1A4A2A 100%)" },
  { name: "São Vicente", count: 3, bg: "linear-gradient(180deg, #7AC0E0 0%, #5AA0C0 40%, #8A7A6A 41%, #6A5A4A 60%, #4A7A9A 61%, #2A5A7A 100%)" },
  { name: "Santo Antão", count: 0, bg: "linear-gradient(180deg, #B0D0E8 0%, #90B0C8 20%, #3A8A4A 21%, #2A7A3A 50%, #4A6A3A 51%, #1A3A1A 100%)" },
  { name: "Fogo", count: 5, bg: "linear-gradient(180deg, #E8B080 0%, #D09060 20%, #8A4A2A 21%, #6A3A1A 55%, #4A2A1A 56%, #2A1A0A 100%)" },
  { name: "Maio", count: 14, bg: "linear-gradient(180deg, #80D0F0 0%, #60B0D0 45%, #F0E8D0 46%, #E0D0B0 55%, #50B0C0 56%, #3090A0 100%)" },
];

export const MARKET_STATS = {
  medianPrice: 144679,
  totalInventory: 396,
  sources: 9,
  islands: [
    { name: "Sal", median: 99500, count: 126 },
    { name: "Santiago", median: 215187, count: 107 },
    { name: "Boa Vista", median: 90000, count: 71 },
    { name: "Maio", median: 79999, count: 14 },
    { name: "São Nicolau", median: 79999, count: 9 },
    { name: "Fogo", median: 79999, count: 5 },
    { name: "São Vicente", median: null, count: 3 },
  ],
};
