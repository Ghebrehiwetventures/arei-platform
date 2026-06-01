import type { CuratedListing, CurationStats, CurationFilters, ReviewVerdict } from "../types";

export type SelectionSet = Set<string>;

/** State stored in the workspace orchestrator. */
export interface WorkspaceState {
  filters: CurationFilters;
  listings: CuratedListing[];
  totalCount: number;
  stats: CurationStats | null;
  selectedIds: SelectionSet;
  openId: string | null;
  ephemeralVerdicts: Record<string, ReviewVerdict>;
  loadingList: boolean;
  loadingStats: boolean;
  error: string | null;
}
