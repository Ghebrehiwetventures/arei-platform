export type PulsePriority = "high" | "medium" | "low";
export type PulseArea =
  | "data_quality"
  | "sources"
  | "listings"
  | "broker_pipeline"
  | "seo"
  | "product"
  | "design"
  | "engineering"
  | "strategy"
  | "founder_focus"
  | "risk";
export type PulseOwner = "founder" | "eloy" | "engineering" | "broker_ops" | "content" | "unknown";
export type PulseConfidence = "high" | "medium" | "low";

export interface AreiPulseBriefing {
  generated_at: string;
  headline: string;
  executive_summary: string;
  primary_focus: {
    title: string;
    reason: string;
    recommended_actions: string[];
    what_to_avoid: string[];
  };
  priority_cards: Array<{
    title: string;
    priority: PulsePriority;
    area: PulseArea;
    summary: string;
    why_this_matters: string[];
    recommended_actions: string[];
    owner: PulseOwner;
    confidence: PulseConfidence;
  }>;
  strategic_risks: Array<{
    risk: string;
    why: string;
    mitigation: string;
  }>;
  delegation_suggestions: Array<{
    task: string;
    owner: PulseOwner;
    reason: string;
  }>;
  open_questions: string[];
  source_notes: string[];
}

export interface AreiPulseRecord {
  id: string;
  created_at: string;
  generated_by: string | null;
  model: string;
  status: "success" | "error" | string;
  headline: string | null;
  briefing: AreiPulseBriefing | null;
  context_snapshot?: unknown;
  error: string | null;
}

export interface AreiPulseApiResponse {
  pulse: AreiPulseRecord | null;
  stale: boolean;
  source_notes: string[];
}
