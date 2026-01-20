import { SourceStatus, SourceState } from "./status";

export const RETRY_LIMITS = {
  scrapeAttemptsMax: 3,
  repairAttemptsMax: 2,
  maxRuntimePerSourceMs: 10 * 60 * 1000, // 10 minutes
  maxTokenBudgetPerSource: 50000,
} as const;

export interface RetryContext {
  state: SourceState;
  startTime: number;
  tokensUsed: number;
}

export function canRetryScrape(ctx: RetryContext): boolean {
  return ctx.state.scrapeAttempts < RETRY_LIMITS.scrapeAttemptsMax;
}

export function canRetryRepair(ctx: RetryContext): boolean {
  return ctx.state.repairAttempts < RETRY_LIMITS.repairAttemptsMax;
}

export function isRuntimeExceeded(ctx: RetryContext): boolean {
  return Date.now() - ctx.startTime >= RETRY_LIMITS.maxRuntimePerSourceMs;
}

export function isTokenBudgetExceeded(ctx: RetryContext): boolean {
  return ctx.tokensUsed >= RETRY_LIMITS.maxTokenBudgetPerSource;
}

export function shouldStop(ctx: RetryContext): boolean {
  return isRuntimeExceeded(ctx) || isTokenBudgetExceeded(ctx);
}

export function determineFailureStatus(ctx: RetryContext, lastError?: string): SourceStatus {
  if (isRuntimeExceeded(ctx) || isTokenBudgetExceeded(ctx)) {
    return SourceStatus.PAUSED_BY_SYSTEM;
  }
  if (ctx.state.scrapeAttempts >= RETRY_LIMITS.scrapeAttemptsMax) {
    return SourceStatus.UNSCRAPABLE;
  }
  if (ctx.state.repairAttempts >= RETRY_LIMITS.repairAttemptsMax) {
    return SourceStatus.BROKEN_SOURCE;
  }
  return SourceStatus.PARTIAL_OK;
}
