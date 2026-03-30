export interface AgentCardSeed {
  id: string;
  name: string;
  lane: "monitoring" | "quality" | "coordination";
  status: "live-signal" | "seeded" | "human-gated";
  summary: string;
  responsibility: string;
  inputs: string[];
  outputs: string[];
  nextStep: string;
  publicAction: "disabled";
}

export interface AgentQueueSeed {
  id: string;
  title: string;
  owner: string;
  state: "ready" | "watching" | "blocked";
  note: string;
}

export interface WeeklyCommandSeed {
  title: string;
  focus: string;
  operator: string;
  checkpoints: string[];
}

export interface KazaVerdeStatusSeed {
  state: "monitoring" | "stable" | "attention";
  summary: string;
  notes: string[];
}

export const phaseAAgentCards: AgentCardSeed[] = [
  {
    id: "agent-sync-watch",
    name: "Sync Watch",
    lane: "monitoring",
    status: "live-signal",
    summary: "Watches ingest freshness and highlights stale or partial runs for a human operator.",
    responsibility: "Operational monitoring",
    inputs: ["Latest sync report", "Dashboard health metrics", "Source quality grades"],
    outputs: ["Run status summary", "Escalation recommendation", "Operator next check"],
    nextStep: "Review the latest run result and decide whether to inspect source quality or rerun manually.",
    publicAction: "disabled",
  },
  {
    id: "agent-data-qa",
    name: "Data QA",
    lane: "quality",
    status: "live-signal",
    summary: "Surfaces weak approval, image, and price coverage so human review can prioritize the right sources.",
    responsibility: "Feed quality triage",
    inputs: ["Source quality RPC", "Listing table filters", "Approval coverage by source"],
    outputs: ["QA shortlist", "Coverage deltas", "Manual investigation targets"],
    nextStep: "Open Data and inspect the worst-graded sources or filtered listings before making any manual decision.",
    publicAction: "disabled",
  },
  {
    id: "agent-market-ops",
    name: "Market Ops Coordinator",
    lane: "coordination",
    status: "seeded",
    summary: "Keeps a simple operator playbook for what to check next across markets until live task orchestration exists.",
    responsibility: "Internal coordination only",
    inputs: ["Seeded operator playbook", "Manual notes", "Latest sync timestamp"],
    outputs: ["Human checklist", "Suggested follow-up order", "No autonomous execution"],
    nextStep: "Use this as a checklist only. No emails, publishes, or public actions are executed in Phase A.",
    publicAction: "disabled",
  },
];

export const phaseAAgentQueue: AgentQueueSeed[] = [
  {
    id: "queue-1",
    title: "Review stale sync threshold against current market activity",
    owner: "Ops",
    state: "ready",
    note: "Human should confirm whether a stale run needs investigation or is acceptable for the current cadence.",
  },
  {
    id: "queue-2",
    title: "Inspect lowest grade sources for missing images or prices",
    owner: "Data QA",
    state: "watching",
    note: "Backed by live dashboard metrics, but the queue entry itself is seeded until live task persistence exists.",
  },
  {
    id: "queue-3",
    title: "Define future Growth and Markets surfaces outside Phase A scope",
    owner: "Product",
    state: "blocked",
    note: "Intentionally deferred. No Growth or Markets buildout in this phase.",
  },
];

export const phaseAWeeklyCommand: WeeklyCommandSeed = {
  title: "Weekly command",
  focus: "Protect trust in the live inventory before adding new operational scope.",
  operator: "Founder / Ops",
  checkpoints: [
    "Check latest sync freshness and whether the run is final",
    "Review worst-graded sources for approval, image, and price coverage",
    "Confirm any follow-up stays human-gated and internal only",
  ],
};

export const phaseAKazaVerdeStatus: KazaVerdeStatusSeed = {
  state: "monitoring",
  summary: "KazaVerde remains downstream from the data engine and should only reflect trusted, human-reviewed operational changes.",
  notes: [
    "No public growth automation is active from AREI Admin Phase A",
    "Consumer-facing impact depends on data quality and sync freshness, not agent autonomy",
  ],
};
