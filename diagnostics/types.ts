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
  imageUrl?: string;
  description?: string;
  sourceName: string;
}

export interface Market {
  id: string;
  name: string;
  status: SourceStatus;
  sources: Source[];
  listings: Listing[];
}
