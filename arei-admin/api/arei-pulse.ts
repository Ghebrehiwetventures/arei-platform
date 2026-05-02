import { createClient } from "@supabase/supabase-js";
import strategyContext from "../project-context/arei-strategy-context.json";

type Json = Record<string, unknown>;
type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const PULSE_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const PULSE_STALE_HOURS = 24;
const ACTIVE_MARKET_PREFIX = "cv_%";

const SYSTEM_PROMPT = `You are AREI Pulse, an executive strategy and operating intelligence layer for Africa Real Estate Index.

You think like a disciplined CEO/chief of staff.
Your job is to decide what the founder/operator should focus on next based on the provided context.

You must:
- connect product work to the business model
- prioritize data quality, trust, broker adoption, and strategic focus
- identify bottlenecks
- recommend what to do next
- recommend what to avoid
- distinguish founder tasks from delegated tasks
- be direct and practical
- avoid generic startup advice
- never invent facts outside the provided context
- clearly state when context is missing
- treat GitHub, Supabase, website, and project memory as evidence
- prefer narrow execution priorities over broad ideation
- keep recommendations actionable within the next 24 to 72 hours

Do not:
- act as a chatbot
- flatter the founder
- recommend random features
- mutate production systems
- pretend to have read unavailable chat history
- overstate confidence`;

const briefingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "generated_at",
    "headline",
    "executive_summary",
    "primary_focus",
    "priority_cards",
    "strategic_risks",
    "delegation_suggestions",
    "open_questions",
    "source_notes",
  ],
  properties: {
    generated_at: { type: "string" },
    headline: { type: "string" },
    executive_summary: { type: "string" },
    primary_focus: {
      type: "object",
      additionalProperties: false,
      required: ["title", "reason", "recommended_actions", "what_to_avoid"],
      properties: {
        title: { type: "string" },
        reason: { type: "string" },
        recommended_actions: { type: "array", items: { type: "string" } },
        what_to_avoid: { type: "array", items: { type: "string" } },
      },
    },
    priority_cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "priority",
          "area",
          "summary",
          "why_this_matters",
          "recommended_actions",
          "owner",
          "confidence",
        ],
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          area: {
            type: "string",
            enum: [
              "data_quality",
              "sources",
              "listings",
              "broker_pipeline",
              "seo",
              "product",
              "design",
              "engineering",
              "strategy",
              "founder_focus",
              "risk",
            ],
          },
          summary: { type: "string" },
          why_this_matters: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
          owner: { type: "string", enum: ["founder", "eloy", "engineering", "broker_ops", "content", "unknown"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    strategic_risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "why", "mitigation"],
        properties: {
          risk: { type: "string" },
          why: { type: "string" },
          mitigation: { type: "string" },
        },
      },
    },
    delegation_suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "owner", "reason"],
        properties: {
          task: { type: "string" },
          owner: { type: "string", enum: ["founder", "eloy", "engineering", "broker_ops", "content", "unknown"] },
          reason: { type: "string" },
        },
      },
    },
    open_questions: { type: "array", items: { type: "string" } },
    source_notes: { type: "array", items: { type: "string" } },
  },
};

function getEnv(name: string): string {
  return process.env[name] || "";
}

function createSupabaseAdmin() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for AREI Pulse");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
}

function headerValue(req: VercelRequest, name: string): string {
  const raw = req.headers[name] || req.headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] || "" : raw || "";
}

function getRequestOrigin(req: VercelRequest): string {
  const host = headerValue(req, "x-forwarded-host") || headerValue(req, "host");
  if (!host) return "";
  const proto = headerValue(req, "x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function assertAdmin(req: VercelRequest, supabase: ReturnType<typeof createSupabaseAdmin>) {
  const allowUnprotectedLocal =
    getEnv("VITE_ADMIN_PROTECTED") === "false" &&
    getEnv("NODE_ENV") !== "production" &&
    getEnv("VERCEL_ENV") !== "production";
  const adminProtected = !allowUnprotectedLocal;

  if (!adminProtected) return { userId: null, email: null };

  const token = bearerToken(req);
  if (!token) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (adminError || !adminRow) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  return { userId: userData.user.id, email: userData.user.email ?? null };
}

async function countRows(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  table: string,
  apply: (query: any) => any
): Promise<number | null> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = apply(query);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

function gradeSource(row: Json) {
  const listingCount = Number(row.listing_count ?? 0);
  const approvedCount = Number(row.approved_count ?? 0);
  const publicFeedCount = Number(row.public_feed_count ?? 0);
  const trustPassedCount = Number(row.trust_passed_count ?? 0);
  const indexableCount = Number(row.indexable_count ?? 0);
  const sqmPct = listingCount > 0 ? (Number(row.with_sqm_count ?? 0) / listingCount) * 100 : 0;
  const bedsPct = listingCount > 0 ? (Number(row.with_beds_count ?? 0) / listingCount) * 100 : 0;
  const bathsPct = listingCount > 0 ? (Number(row.with_baths_count ?? 0) / listingCount) * 100 : 0;
  const feedConversionPct = approvedCount > 0 ? (publicFeedCount / approvedCount) * 100 : 0;
  const updatedAt = typeof row.last_updated_at === "string" ? row.last_updated_at : null;
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const stale = !Number.isFinite(updatedMs) || Date.now() - updatedMs >= 30 * 24 * 60 * 60 * 1000;

  if (listingCount === 0) return "C";
  if (
    (approvedCount > 0 && publicFeedCount === 0) ||
    (approvedCount > 0 && trustPassedCount === 0) ||
    (approvedCount > 0 && indexableCount === 0) ||
    stale
  ) {
    return "D";
  }
  if ((approvedCount >= 20 && feedConversionPct < 25) || (listingCount >= 10 && sqmPct === 0)) return "C";
  if (sqmPct < 30 || bedsPct < 30 || bathsPct < 30) return "B";
  return "A";
}

async function getAdminSnapshot(supabase: ReturnType<typeof createSupabaseAdmin>, req: VercelRequest) {
  const sourceNotes: string[] = [];
  const [
    totalListings,
    approvedListings,
    hiddenListings,
    missingPriceCount,
    missingSqmCount,
    missingImagesCount,
    missingDescriptionCount,
  ] = await Promise.all([
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX)),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).eq("approved", true)),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).eq("approved", false)),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).is("price", null)),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).is("property_size_sqm", null).is("area_sqm", null)),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).or("image_urls.is.null,image_urls.eq.{}")),
    countRows(supabase, "listings", (q) => q.ilike("source_id", ACTIVE_MARKET_PREFIX).or("description.is.null,description.eq.")),
  ]);

  const { data: sourceRows, error: sourceError } = await supabase.rpc("get_source_quality_stats");
  if (sourceError) sourceNotes.push(`Supabase source health RPC unavailable: ${sourceError.message}`);

  const cvSourceRows = ((sourceRows || []) as Json[]).filter((row) => String(row.source_id || "").startsWith("cv_"));
  const sourceHealth = cvSourceRows.map((row) => ({
    source_id: row.source_id,
    listing_count: Number(row.listing_count ?? 0),
    approved_count: Number(row.approved_count ?? 0),
    public_feed_count: Number(row.public_feed_count ?? 0),
    with_price_count: Number(row.with_price_count ?? 0),
    with_image_count: Number(row.with_image_count ?? 0),
    with_sqm_count: Number(row.with_sqm_count ?? 0),
    trust_passed_count: Number(row.trust_passed_count ?? 0),
    indexable_count: Number(row.indexable_count ?? 0),
    last_updated_at: row.last_updated_at ?? null,
    grade: gradeSource(row),
  }));

  const staleSources = sourceHealth.filter((source) => {
    const updatedAt = typeof source.last_updated_at === "string" ? source.last_updated_at : null;
    const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
    return !Number.isFinite(updatedMs) || Date.now() - updatedMs >= 30 * 24 * 60 * 60 * 1000;
  });
  const degradedSources = sourceHealth.filter((source) => source.grade === "C" || source.grade === "D");

  let recentIngestReportSummary: unknown = null;
  try {
    const origin = getRequestOrigin(req);
    const ingestReportUrl = getEnv("AREI_INGEST_REPORT_URL") || (origin ? `${origin}/cv_ingest_report.json` : "");
    if (ingestReportUrl) {
      const response = await fetch(ingestReportUrl);
      if (response.ok) {
        const report = await response.json();
        recentIngestReportSummary = {
          generatedAt: report.generatedAt,
          runPhase: report.runPhase,
          isFinal: report.isFinal,
          summary: report.summary,
        };
      } else {
        sourceNotes.push(`Recent ingest report unavailable: ${response.status}`);
      }
    } else {
      sourceNotes.push("Recent ingest report summary unavailable: AREI_INGEST_REPORT_URL is not configured.");
    }
  } catch (error) {
    sourceNotes.push(`Recent ingest report summary unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return {
    total_listings: totalListings,
    public_approved_listings: approvedListings,
    hidden_listings: hiddenListings,
    missing_price_count: missingPriceCount,
    missing_sqm_count: missingSqmCount,
    missing_images_count: missingImagesCount,
    missing_description_count: missingDescriptionCount,
    source_health_grades: sourceHealth,
    stale_sources: staleSources,
    failed_or_degraded_ingestion_sources: degradedSources,
    approval_queue_count: hiddenListings,
    recent_ingest_report_summary: recentIngestReportSummary,
    source_notes: sourceNotes,
  };
}

async function getProjectMemory(supabase: ReturnType<typeof createSupabaseAdmin>) {
  const { data, error } = await supabase
    .from("arei_project_memory")
    .select("id,created_at,type,title,body,tags,source")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return {
      notes: [],
      source_notes: [`Project memory unavailable: ${error.message}. Run the AREI Pulse migration to enable arei_project_memory.`],
    };
  }
  return {
    notes: data || [],
    source_notes: ["ChatGPT history is not connected. AREI Pulse uses arei_project_memory and canonical project context instead."],
  };
}

async function getGithubSnapshot() {
  const token = getEnv("GITHUB_TOKEN");
  const repo = getEnv("GITHUB_REPOSITORY") || getEnv("AREI_GITHUB_REPOSITORY");
  if (!token || !repo) {
    return {
      available: false,
      note: "GitHub context unavailable: GITHUB_TOKEN and GITHUB_REPOSITORY/AREI_GITHUB_REPOSITORY are not configured.",
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const gh = async (path: string) => {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return response.json();
  };

  try {
    const [commits, mergedPulls, openPulls, openIssues] = await Promise.all([
      gh("/commits?sha=main&per_page=5"),
      gh("/pulls?state=closed&sort=updated&direction=desc&per_page=10"),
      gh("/pulls?state=open&sort=updated&direction=desc&per_page=10"),
      gh("/issues?state=open&sort=updated&direction=desc&per_page=10"),
    ]);
    return {
      available: true,
      latest_commits_on_main: commits.map((commit: Json) => ({
        sha: String(commit.sha || "").slice(0, 7),
        message: (commit.commit as Json | undefined)?.message,
        author: ((commit.commit as Json | undefined)?.author as Json | undefined)?.name,
        date: ((commit.commit as Json | undefined)?.author as Json | undefined)?.date,
      })),
      latest_merged_prs: mergedPulls
        .filter((pull: Json) => pull.merged_at)
        .slice(0, 5)
        .map((pull: Json) => ({ number: pull.number, title: pull.title, merged_at: pull.merged_at })),
      open_prs: openPulls.map((pull: Json) => ({ number: pull.number, title: pull.title, updated_at: pull.updated_at })),
      open_issues: openIssues
        .filter((issue: Json) => !issue.pull_request)
        .map((issue: Json) => ({ number: issue.number, title: issue.title, updated_at: issue.updated_at })),
      deployment_metadata: getEnv("VERCEL_GIT_COMMIT_SHA")
        ? {
            provider: "vercel",
            commit_sha: getEnv("VERCEL_GIT_COMMIT_SHA").slice(0, 7),
            commit_ref: getEnv("VERCEL_GIT_COMMIT_REF"),
          }
        : "Deployment metadata unavailable in environment.",
    };
  } catch (error) {
    return {
      available: false,
      note: `GitHub context unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

async function getWebsiteSnapshot() {
  const baseUrl = getEnv("AREI_WEBSITE_URL") || getEnv("VITE_PUBLIC_SITE_URL");
  if (!baseUrl) {
    return {
      available: false,
      note: "Website context unavailable: AREI_WEBSITE_URL or VITE_PUBLIC_SITE_URL is not configured.",
    };
  }

  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const response = await fetch(sitemapUrl);
    if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
    const sitemap = await response.text();
    const urls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g))
      .map((match) => match[1])
      .slice(0, 8);
    return {
      available: true,
      sitemap_url: sitemapUrl,
      sampled_pages: urls,
      note: "V1 samples sitemap URLs only and does not crawl page bodies.",
    };
  } catch (error) {
    return {
      available: false,
      note: `Website context unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

async function buildPulseContext(supabase: ReturnType<typeof createSupabaseAdmin>, req: VercelRequest) {
  const [adminSnapshot, githubSnapshot, websiteSnapshot, projectMemory] = await Promise.all([
    getAdminSnapshot(supabase, req),
    getGithubSnapshot(),
    getWebsiteSnapshot(),
    getProjectMemory(supabase),
  ]);

  return {
    built_at: new Date().toISOString(),
    constraints: {
      version: "read-only V1",
      production_mutation_allowed: false,
      note: "AREI Pulse may recommend actions but must not mutate listings, approvals, sources, GitHub, website content, or production systems.",
    },
    admin_snapshot: adminSnapshot,
    github_snapshot: githubSnapshot,
    website_snapshot: websiteSnapshot,
    project_knowledge_base: strategyContext,
    project_memory: projectMemory.notes,
    context_source_notes: [
      ...adminSnapshot.source_notes,
      ...(projectMemory.source_notes || []),
      typeof githubSnapshot.note === "string" ? githubSnapshot.note : "",
      typeof websiteSnapshot.note === "string" ? websiteSnapshot.note : "",
    ].filter(Boolean),
  };
}

function extractOutputText(response: Json): string {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  const textParts: string[] = [];
  for (const item of output) {
    const content = Array.isArray((item as Json).content) ? ((item as Json).content as Json[]) : [];
    for (const part of content) {
      if (typeof part.text === "string") textParts.push(part.text);
    }
  }
  return textParts.join("");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateBriefing(value: unknown): asserts value is Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Briefing is not an object");
  const obj = value as Json;
  for (const key of Object.keys(briefingSchema.properties)) {
    if (!(key in obj)) throw new Error(`Briefing missing ${key}`);
  }
  if (!obj.primary_focus || typeof obj.primary_focus !== "object") throw new Error("Briefing primary_focus is invalid");
  if (!Array.isArray(obj.priority_cards)) throw new Error("Briefing priority_cards is invalid");
  if (!Array.isArray(obj.strategic_risks)) throw new Error("Briefing strategic_risks is invalid");
  if (!Array.isArray(obj.delegation_suggestions)) throw new Error("Briefing delegation_suggestions is invalid");
  if (!isStringArray(obj.open_questions)) throw new Error("Briefing open_questions is invalid");
  if (!isStringArray(obj.source_notes)) throw new Error("Briefing source_notes is invalid");
}

async function generateBriefing(context: Json) {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for AREI Pulse generation");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PULSE_MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate today's AREI Pulse as strict JSON using only this context:\n${JSON.stringify(context)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "arei_pulse_briefing",
          strict: true,
          schema: briefingSchema,
        },
      },
    }),
  });

  const payload = (await response.json()) as Json;
  if (!response.ok) {
    const message = ((payload.error as Json | undefined)?.message as string | undefined) || `OpenAI request failed with ${response.status}`;
    throw new Error(message);
  }

  const text = extractOutputText(payload);
  const parsed = JSON.parse(text) as unknown;
  validateBriefing(parsed);
  return parsed as Json;
}

async function getLatestPulse(supabase: ReturnType<typeof createSupabaseAdmin>) {
  const { data, error } = await supabase
    .from("arei_pulse")
    .select("id,created_at,generated_by,model,status,headline,briefing,error")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load AREI Pulse: ${error.message}`);

  const createdAt = data?.created_at ? new Date(data.created_at).getTime() : NaN;
  const stale = !Number.isFinite(createdAt) || Date.now() - createdAt > PULSE_STALE_HOURS * 60 * 60 * 1000;
  return {
    pulse: data || null,
    stale,
    source_notes: data?.briefing?.source_notes || [],
  };
}

async function savePulseError(supabase: ReturnType<typeof createSupabaseAdmin>, error: Error, contextSnapshot?: unknown) {
  await supabase.from("arei_pulse").insert({
    model: PULSE_MODEL,
    status: "error",
    headline: null,
    briefing: null,
    context_snapshot: contextSnapshot ?? null,
    error: error.message,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase: ReturnType<typeof createSupabaseAdmin>;
  try {
    supabase = createSupabaseAdmin();
    const admin = await assertAdmin(req, supabase);

    if (req.method === "GET") {
      res.status(200).json(await getLatestPulse(supabase));
      return;
    }

    const contextSnapshot = await buildPulseContext(supabase, req);
    try {
      const briefing = await generateBriefing(contextSnapshot as Json);
      const { data, error } = await supabase
        .from("arei_pulse")
        .insert({
          generated_by: admin.email || admin.userId,
          model: PULSE_MODEL,
          status: "success",
          headline: briefing.headline,
          briefing,
          context_snapshot: contextSnapshot,
          error: null,
        })
        .select("id,created_at,generated_by,model,status,headline,briefing,error")
        .single();

      if (error) throw new Error(`Failed to save AREI Pulse: ${error.message}`);
      res.status(200).json({ pulse: data, stale: false, source_notes: briefing.source_notes || [] });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("AREI Pulse generation failed");
      await savePulseError(supabase, err, contextSnapshot).catch(() => undefined);
      res.status(502).json({ error: err.message });
    }
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : "AREI Pulse failed" });
  }
}
