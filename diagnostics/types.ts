export enum SourceStatus {
  OK = "OK",
  PARTIAL_OK = "PARTIAL_OK",
  BROKEN_SOURCE = "BROKEN_SOURCE",
  UNSCRAPABLE = "UNSCRAPABLE",
  PAUSED_BY_SYSTEM = "PAUSED_BY_SYSTEM",
}

export interface SourceState {
  status: SourceStatus;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
  pausedAt?: Date;
}

export interface Source {
  id: string;
  name: string;
  state: SourceState;
}

export interface Listing {
  id: string;
  title?: string;
  price?: number;
  currency?: string;
  images: string[];
  description?: string;
  sourceName: string;
  location?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  property_type?: string;
}

export interface Market {
  id: string;
  name: string;
  status: SourceStatus;
  sources: Source[];
  listings: Listing[];
}
