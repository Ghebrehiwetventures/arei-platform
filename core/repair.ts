import { SourceStatus, SourceState, createInitialState } from "./status";
import {
  RetryContext,
  canRetryScrape,
  canRetryRepair,
  shouldStop,
  determineFailureStatus,
} from "./retryPolicy";

export interface RepairResult {
  state: SourceState;
  stopped: boolean;
  reason?: string;
}

export function executeRepairLoop(
  sourceId: string,
  scrapeFn: () => Promise<boolean>,
  repairFn: () => Promise<boolean>
): Promise<RepairResult> {
  return runRepairLoop(sourceId, scrapeFn, repairFn);
}

async function runRepairLoop(
  sourceId: string,
  scrapeFn: () => Promise<boolean>,
  repairFn: () => Promise<boolean>
): Promise<RepairResult> {
  const state = createInitialState();
  const ctx: RetryContext = {
    state,
    startTime: Date.now(),
    tokensUsed: 0,
  };

  while (true) {
    if (shouldStop(ctx)) {
      state.status = SourceStatus.PAUSED_BY_SYSTEM;
      state.pauseReason = "repair_limit_exceeded";
      state.pauseDetail = "Paused after retry/repair budget was exhausted";
      state.pausedAt = new Date();
      return { state, stopped: true, reason: "limit_exceeded" };
    }

    if (!canRetryScrape(ctx)) {
      state.status = determineFailureStatus(ctx);
      return { state, stopped: true, reason: "scrape_attempts_exhausted" };
    }

    state.scrapeAttempts++;
    let scrapeSuccess = false;

    try {
      scrapeSuccess = await scrapeFn();
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
    }

    if (scrapeSuccess) {
      state.status = SourceStatus.OK;
      return { state, stopped: false };
    }

    if (shouldStop(ctx)) {
      state.status = SourceStatus.PAUSED_BY_SYSTEM;
      state.pauseReason = "repair_limit_exceeded";
      state.pauseDetail = "Paused after retry/repair budget was exhausted";
      state.pausedAt = new Date();
      return { state, stopped: true, reason: "limit_exceeded" };
    }

    if (!canRetryRepair(ctx)) {
      state.status = determineFailureStatus(ctx);
      return { state, stopped: true, reason: "repair_attempts_exhausted" };
    }

    state.repairAttempts++;
    let repairSuccess = false;

    try {
      repairSuccess = await repairFn();
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
    }

    if (!repairSuccess) {
      if (!canRetryRepair(ctx)) {
        state.status = SourceStatus.BROKEN_SOURCE;
        return { state, stopped: true, reason: "repair_failed" };
      }
    }
  }
}
