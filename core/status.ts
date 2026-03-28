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
  pauseReason?: string;
  pauseDetail?: string;
  pausedAt?: Date;
}

export function createInitialState(
  status: SourceStatus = SourceStatus.OK
): SourceState {
  return {
    status,
    scrapeAttempts: 0,
    repairAttempts: 0,
  };
}
