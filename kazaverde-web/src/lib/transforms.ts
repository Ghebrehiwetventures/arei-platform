import type { ListingCard, ListingDetail } from "arei-sdk";
import type { DemoListing } from "./demo-data";

const DEFAULT_BG = "linear-gradient(145deg,#5B8A72,#1A4A32)";

/** Convert SDK ListingCard → DemoListing for PropertyCard component */
export function cardToDemoListing(card: ListingCard): DemoListing {
  return {
    id: card.id,
    title: card.title,
    island: card.island,
    city: card.city,
    price: card.price,
    currency: card.currency ?? "",
    image_urls: card.image_urls?.length ? card.image_urls : (card.image_url ? [card.image_url] : []),
    bedrooms: card.bedrooms,
    bathrooms: card.bathrooms,
    property_type: card.property_type,
    land_area_sqm: card.land_area_sqm,
    property_size_sqm: null,
    description: null,
    description_html: null,
    first_seen_at: card.first_seen_at,
    source_id: card.source_id,
    source_url: "",
    last_seen_at: null,
    _bg: DEFAULT_BG,
  };
}

/** Convert SDK ListingDetail -> DemoListing for PropertyCard component */
export function detailToDemoListing(detail: ListingDetail): DemoListing {
  return {
    id: detail.id,
    title: detail.title,
    island: detail.island,
    city: detail.city,
    price: detail.price,
    currency: detail.currency ?? "",
    image_urls: detail.image_urls ?? [],
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    property_type: detail.property_type,
    land_area_sqm: detail.land_area_sqm,
    property_size_sqm: detail.property_size_sqm,
    description: detail.description,
    description_html: detail.description_html ?? null,
    first_seen_at: detail.first_seen_at,
    source_id: detail.source_id,
    source_url: detail.source_url,
    last_seen_at: detail.last_seen_at,
    _bg: DEFAULT_BG,
  };
}
