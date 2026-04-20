export interface SourceReport {
  id: string;
  name: string;
  status: string;
  lastError?: string;
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
}

export interface ListingReport {
  id: string;
  sourceId: string;
  sourceName: string;
}

export interface HiddenListingReport extends ListingReport {
  violations: string[];
}

export interface IngestReport {
  marketId: string;
  marketName: string;
  generatedAt: string;
  runPhase?: "post_fetch_snapshot" | "final_post_enrichment";
  isFinal?: boolean;
  runStartedAt?: string;
  artifactWrittenAt?: string;
  summary: {
    totalListings: number;
    visibleCount: number;
    hiddenCount: number;
    duplicatesRemoved: number;
    sourceCount: number;
  };
  sources: SourceReport[];
  visibleListings: ListingReport[];
  hiddenListings: HiddenListingReport[];
}
