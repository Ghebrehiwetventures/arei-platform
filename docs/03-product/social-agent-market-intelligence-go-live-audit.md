# Social Agent Market Intelligence Go-Live Audit

Last updated: 2026-05-15

Implementation status update: the audit findings below describe the pre-build state. The first implementation pass is documented in `docs/03-product/social-agent-market-intelligence-implementation.md` and adds a Cape Verde Market News social draft workflow, protected server-side LLM generation, editable approval states, manual copy fallback, and a guarded Instagram publish connector.

## Scope and Proof Standard

This is an audit and go-live plan only. No code changes, social account connections, publishing workflows, new public sites, market expansion, or public renaming decisions are authorized by this document.

Truth labels follow `docs/operations/execution-protocol.md`:

- `Verified in code`: confirmed in current repo source.
- `Verified in data/output`: confirmed from local command output or file inventory.
- `Historical doc only`: appears in docs or archived scripts, not active code.
- `Unverified`: not confirmed in code, data, or live systems during this pass.

## Executive Summary

AREI Admin has a current `Content Draft Agent v1`, but it is a deterministic listing-based draft generator, not an AI social media agent in the runtime sense. It creates 3 to 5 draft captions from live Cape Verde listing feed data, stores them in Supabase `content_drafts`, and exposes an admin approval queue with `pending`, `approved`, `rejected`, and `revision_requested` states. It does not publish, schedule, call Typefully, call Instagram/LinkedIn/X/Facebook APIs, or call OpenAI/Claude APIs.

The current implementation is safe from accidental auto-posting because no publishing integration exists. It is not ready to generate Cape Verde Market News social distribution because it only accepts property listings as input and its schema lacks market-news fields such as `what_happened`, `why_it_matters`, `source_name`, `source_url`, `country`, `region`, `category`, `tags`, and review/published status from `market_news`.

Recommended path: use the existing admin approval queue pattern, but add a separate market-intelligence social draft type before live testing. Keep publishing manual in Phase 1. Use ChatGPT and Claude through a server-side draft endpoint only after the prompt, schema, source preservation, and review states are explicit.

## 1. Current Social Agent Architecture

### Where it lives

`Verified in code`

- UI: `arei-admin/app.tsx`, `AgentsApprovalsView`.
- Draft generation and storage logic: `arei-admin/data.ts`, section `CONTENT DRAFT AGENT V1`.
- Types: `arei-admin/types.ts`, `ContentDraft` and `ContentDraftStatus`.
- Persistence schema: `migrations/022_content_drafts.sql` and `migrations/023_content_drafts_tighten_access.sql`.

### Inputs

`Verified in code`

The agent reads Cape Verde property listing candidates from Supabase views:

- `v1_feed_cv_indexable`
- fallback `v1_feed_cv`

It selects these listing fields:

- `id`
- `title`
- `price`
- `currency`
- `source_id`
- `source_url`
- `island`
- `city`
- `bedrooms`
- `bathrooms`
- `property_size_sqm`
- `image_urls`
- `approved`
- `property_type`
- `description`

It filters to candidates with at least one image, scores them with `scoreListingForContent`, and selects up to `MAX_CONTENT_DRAFTS_PER_RUN = 5`.

### Outputs

`Verified in code`

Each generated draft contains:

- `id`
- `sourceListingId`
- `listingTitle`
- `selectedImage`
- `suggestedCaption`
- `suggestedHashtags`
- `suggestedChannel`
- `createdAt`
- `status`
- optional `statusNote`

The generated caption is deterministic. Example pattern:

`{title} in {location}. Asking {price}. Highlights: {facts}. Draft only for approval review. Not published.`

### Drafts, schedules, and publishing

`Verified in code`

- Creates drafts: yes.
- Schedules posts: no.
- Publishes posts: no.
- UI explicitly says publishing is `Disabled` and `Draft to approval only`.
- The `Agents > Approvals` copy states: "Everything stays human-gated in approvals. Nothing is published automatically."

### Platform/API connections

`Verified in code`

- Supported draft channel enum: `instagram`, `facebook`, `linkedin`.
- No `x`/Twitter channel in the draft schema.
- No real platform API clients or calls for Instagram, Facebook, LinkedIn, X, Typefully, Buffer, Hootsuite, Later, or similar.
- No OAuth, webhook, scheduler, or token handling for social platforms.

`Verified in data/output`

- Repo search found no active code references to `INSTAGRAM`, `LINKEDIN`, `TWITTER`, `TYPEFULLY`, or social publishing API env vars.

### Storage

`Verified in code`

Drafts are stored in `public.content_drafts` with columns:

- `id`
- `source_listing_id`
- `listing_title`
- `selected_image`
- `suggested_caption`
- `suggested_hashtags`
- `suggested_channel`
- `created_at`
- `status`
- `status_note`
- `updated_at`

### Edit-before-publish support

`Verified in code`

- Drafts can be approved, rejected, or marked revision requested.
- Revision note can be entered through `window.prompt`.
- The actual `suggested_caption`, hashtags, channel, and image are not editable in the current UI.
- There is no "regenerate this draft" action for one draft. Generation can be run again, but same-day duplicate listing drafts are avoided.

## 2. Market News Compatibility

### Current compatibility

`Verified in code`

The current social agent cannot directly use Cape Verde Market News items as input. It only queries listing feed views and creates listing-driven property captions.

### Market News implementation status in repo

`Historical doc only`

The new strategy document defines required fields for market intelligence items:

- title
- what happened
- why it matters
- source name
- source URL
- country
- region
- category
- tags
- confidence level
- review status
- published status
- published date

`Historical doc only`

`docs/archive/editorial_publish_script_reference_2026-05-14.md` references a Supabase table called `market_news`, with fields including `title`, `snippet`, `why_it_matters`, `category`, and `status`. The file is explicitly archived and says not to run it.

`Verified in code`

No active frontend route for `/market-news` exists in `kazaverde-web/src/App.tsx`. Current routes include `/`, `/listings`, `/listing/:id`, `/market`, `/saved`, `/about`, `/blog`, `/blog/:slug`, `/privacy`, and `/cookie-policy`.

### Field-by-field compatibility

`Verified in code`

Current `ContentDraft` supports only listing-specific inputs. Compatibility with Market News fields:

| Market News field | Current social agent support | Notes |
| --- | --- | --- |
| title | Partial | `listingTitle` exists, but tied to listing IDs. |
| what happened / factual summary | No | No field or prompt concept. |
| why it matters | No | No field or prompt concept. |
| source name | Partial | Listing `sourceName` exists internally, not stored in draft. |
| source URL | Partial | Listing `sourceUrl` loaded, not stored in draft. |
| category | No | No field. |
| country | No | Implied Cape Verde from feed, not stored. |
| region | No | No field. |
| tags | Partial | Hashtags exist, but not item tags. |
| publish status | No | Draft status is approval status, not source item publish status. |
| review status | Partial | Draft approval status exists, not Market News editorial review status. |

## 3. Prompt and Model Setup

### Current prompt location

`Verified in code`

There is no LLM prompt for the current social draft agent. Caption generation lives in deterministic TypeScript functions in `arei-admin/data.ts`:

- `buildCaption`
- `buildSuggestedHashtags`
- `chooseSuggestedChannel`
- `scoreListingForContent`

`Historical doc only`

`docs/06-go-to-market/kazaverde-content-brain-spec.md` defines a qualitative content standard for listing social posts. It is not wired into a model or prompt in active code.

### Current model/API usage

`Verified in code`

The repo has no active OpenAI or Anthropic SDK dependency and no active calls to ChatGPT, Claude, OpenAI Responses API, Anthropic Messages API, or similar.

`Verified in data/output`

Local env variable names include `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`, but current app code does not consume them.

### Configurability

`Verified in code`

Because there is no model path, there is no configurable model choice. Changing caption logic currently requires code changes and deploy.

### Can the system compare ChatGPT and Claude outputs?

`Verified in code`

No. There is no dual-model runner, comparison UI, output versioning, or evaluation storage.

### Recommended model usage

Recommended build direction:

- Use ChatGPT for structured extraction, factual compression, format discipline, JSON schema adherence, and platform-specific length control.
- Use Claude for tone pass, nuance, overclaim detection, and institutional editorial judgment.
- For Phase 0, compare both models on the same 5 Cape Verde Market News items and store outputs side by side.
- For production drafting, avoid mandatory dual-model calls for every post until quality gain is proven. Start with one primary model plus a lightweight rule-based safety checklist.

This split makes sense as a workflow recommendation, but it is not supported by the current implementation yet.

## 4. Editorial Alignment

### Current listing agent vs Market Intelligence principles

`Verified in code`

Current agent strengths:

- Simple English.
- No direct investment advice.
- No auto-publishing.
- Low risk of hallucination because it does not use an LLM.

Current gaps:

- Not Market News aware.
- No source/context preservation in stored drafts.
- Fact and interpretation are not separated.
- No explicit no-hype or no-overclaiming checks.
- No source URL in the draft output.
- Uses property listing language, not investor-facing market signal language.
- Suggested hashtags can include generic brand/distribution tags such as `AfricaPropertyIndex`; acceptable for listing posts, but not enough for source-linked market intelligence.

### Alignment with desired AREI flow

Desired:

`local market signal -> simple explanation -> investor relevance -> source/context preserved -> human-reviewed social draft -> controlled publishing`

Current:

`listing candidate -> deterministic caption -> hashtags/channel -> human approval status -> no publishing`

The current system covers only the final approval container pattern. It does not cover the market signal, explanation, investor relevance, or source preservation layers.

## 5. Human Review and Safety

### Review every draft

`Verified in code`

Yes, drafts land in an admin approvals view and default to `pending`.

### Reject or request revision

`Verified in code`

Yes. Statuses are `pending`, `approved`, `rejected`, and `revision_requested`.

### Regenerate

`Verified in code`

Not per draft. The generate button creates new drafts from candidate listings, but there is no explicit regenerate flow for a rejected or revision-requested item.

### Edit

`Verified in code`

No. The current admin UI does not edit caption text, hashtags, selected image, or channel.

### Approval states

`Verified in code`

Yes, at draft level.

### Public leakage risk

`Verified in code`

`content_drafts` is readable and writable by the Supabase `anon` role according to `migrations/023_content_drafts_tighten_access.sql`. The admin app itself is password-gated in production by default, but database access is still broad for any holder of the anon key if the table exists with these policies.

This is acceptable only for an internal prototype. Before market intelligence drafts include source-sensitive notes, unpublished editorial judgment, or model outputs, access should be tightened through a server-side admin API or mature auth/RLS.

### Accidental auto-posting risk

`Verified in code`

Low today. There is no publishing or scheduling integration.

Future risk rises sharply if Typefully, Meta, LinkedIn, or X tokens are added without a server-side approval gate and explicit "approved for scheduling" state.

## 6. Go-Live Readiness

### Readiness assessment

| Area | Current status | Assessment |
| --- | --- | --- |
| Content quality | `Verified in code` | Not ready for Market News. Current captions are listing templates. |
| Source integrity | `Verified in code` | Not ready. Source URLs are not stored in content drafts. |
| Review workflow | `Verified in code` | Partially ready. Approval states exist, but no edit/regenerate/audit trail. |
| Publishing control | `Verified in code` | Safe now because publishing is absent. |
| Account/API safety | `Verified in code` | Safe now because no social tokens are integrated. |
| Analytics/measurement | `Verified in code` | Partial. Vercel Analytics exists on `kazaverde-web`; no social metrics ingestion or UTM discipline is implemented. |
| Rollback ability | `Verified in code` | Drafts can be rejected, but there is no connected publishing rollback because no publishing exists. |

### Overall readiness

The system is ready for an internal dry run after adding or manually simulating Market News social draft inputs. It is not ready for a controlled live test of Market News social distribution inside AREI Admin until the draft schema and UI support Market News fields, source links, editable copy, and explicit human approval.

Manual publishing outside the app can begin only after Phase 0 produces acceptable human-reviewed drafts.

## 7. Analytics and Measurement

### Current measurement

`Verified in code`

- `kazaverde-web` includes `@vercel/analytics` and renders `<Analytics />`.
- Newsletter signups are stored in `newsletter_subscribers`.
- The newsletter table stores only `id`, `email`, and `created_at`.
- No UTM capture is stored with newsletter subscriptions.

`Verified in code`

No code currently measures:

- social impressions
- likes
- saves
- shares
- comments
- profile visits
- follows
- platform-native link clicks
- source-specific newsletter signups
- traffic specifically to `/market-news`

`Verified in code`

There is no active `/market-news` route in the checked-in consumer app.

### Simplest measurement setup

For Phase 1 manual publishing:

1. Use manual platform analytics for impressions, likes, saves, shares, comments, follows, and profile visits.
2. Add UTM links manually in every post:
   - `utm_source=instagram|linkedin|x`
   - `utm_medium=social`
   - `utm_campaign=cv_market_news_pilot`
   - `utm_content={item_slug_or_short_id}_{format}`
3. Route social links to the existing Cape Verde site surface only. If `/market-news` is not live in the codebase being deployed, use the closest existing public item page or defer social link-out until the Market News route is verified live.
4. Track site visits and referrers in Vercel Analytics.
5. Before Phase 2, extend `newsletter_subscribers` to capture optional source metadata: landing page, UTM source, UTM campaign, UTM content, referrer. Keep this minimal and privacy-aware.

## 8. Proposed Content Formats

Each format should be generated from one Market News item. Every output must preserve the source name and link context in the draft metadata, even when the platform caption cannot carry a clickable link.

### A. Instagram feed caption

Short, clear, investor-facing.

Template:

```text
{Clear headline}

What happened: {1 sentence factual summary}

Why it matters: {1 sentence investor relevance, cautious and non-advisory}

Source: {source_name}
Read more: link in bio / Market News
```

Rules:

- No more than 900 characters for the first pilot.
- No return claims.
- No "breaking", "huge", "must-watch", or fake urgency.
- Hashtags: 3 to 5, location/source/category relevant only.

### B. Instagram story

3 frames:

1. `What happened`: one short factual sentence.
2. `Why it matters`: one investor relevance sentence.
3. `Read more / source`: source name, Market News CTA, and original-source context.

Rules:

- Each frame should work as a screenshot-ready text block.
- Keep source attribution visible on frame 3.
- Do not imply AREI is the original publisher.

### C. Carousel idea

3 to 5 slides:

1. Headline: simple signal, not hype.
2. What happened: factual summary.
3. Why it matters: investor context.
4. Optional context: country/category/tag or "what to watch next".
5. Source / read more: source name, source URL in metadata, Market News link.

Rules:

- Slide 2 is fact.
- Slide 3 is interpretation.
- Final slide must preserve source/context.

### D. LinkedIn post

More serious, slightly longer, source-linked.

Template:

```text
{Cape Verde market signal headline}

What happened:
{2-3 factual sentences}

Why it matters:
{2-3 sentences on investor relevance, written cautiously}

Source: {source_name}
Context: {market_news_url or source_url}
```

Rules:

- Best platform for source-linked market intelligence pilot.
- Keep institutional tone.
- Avoid giving advice or predicting returns.

### E. X post

Short version, no thread unless useful.

Template:

```text
Cape Verde market signal: {headline}

{What happened in one sentence}

Why it matters: {one cautious investor-context sentence}

Source: {source_name}
{link}
```

Rules:

- Use one post by default.
- Use a short thread only when fact/context/source cannot fit safely in one post.

## 9. Go-Live Plan

### Phase 0: Internal dry run

Objective: verify quality without publishing.

Steps:

- Select 5 existing Cape Verde Market News items.
- Generate social drafts for Instagram feed, Instagram story, carousel, LinkedIn, and X.
- Compare ChatGPT vs Claude output if possible.
- Evaluate factual accuracy, tone, source preservation, overclaiming, and usefulness.
- Human review only. No publishing.

Exit criteria:

- At least 3 of 5 items produce usable drafts after human edit.
- No unsupported claim survives review.
- Source and fact/interpretation split are preserved.

### Phase 1: Manual publish pilot

Objective: validate controlled distribution with no automation.

Steps:

- Publish 3 to 5 posts manually over one week.
- Start with LinkedIn and Instagram feed. Add X only if a concise source-linked format is working.
- Use UTM links.
- Track engagement and clicks manually.
- Keep Cape Verde only.

Exit criteria:

- No brand/tone incidents.
- Basic engagement and click data captured.
- Human review process is not burdensome.

### Phase 2: Assisted drafting cadence

Objective: make the weekly drafting loop repeatable.

Steps:

- Agent generates drafts weekly from reviewed Cape Verde Market News items.
- Human edits and approves.
- Publish manually or schedule through Typefully or native platform scheduling.
- Keep Cape Verde only.

Exit criteria:

- Draft schema supports edit history, source links, approval state, and platform variants.
- Founder can complete review in one weekly session.

### Phase 3: Controlled automation

Objective: allow scheduling only after review workflow is trusted.

Steps:

- Add scheduling integration only after manual pilot proves quality.
- Use a separate `approved_for_scheduling` state.
- Never direct auto-publish from generated draft.
- Store external platform post IDs after scheduling.
- Keep manual kill switch: revoke token, disable scheduler env, or set integration disabled flag.

Exit criteria:

- No generated content crosses AREI's boundary without human approval.
- API tokens are server-side only.
- Audit log exists for approve/schedule actions.

### Phase 4: Expansion evaluation

Objective: decide whether expansion is justified.

Steps:

- Review Cape Verde results first.
- Evaluate quality, subscriber signal, site traffic, and workflow load.
- Consider Ghana/Kenya/Nigeria/Morocco/Senegal only as later pilot candidates.
- Do not launch cross-market Pulse yet.

Exit criteria:

- Cape Verde process is stable.
- Source quality and review cadence are proven.
- There is evidence that more markets would add value rather than noise.

## 10. Recommended Operating Rules

- Start with 3 posts per week.
- No more than 1 post per day in the first month.
- Every post must tie back to a real source or a reviewed Market News item.
- No generic motivational content.
- No unsupported macro claims.
- No investment advice.
- No paid promotion until organic signal exists.
- Human approval required for every post.
- No direct auto-publishing from AI output.
- Keep Cape Verde only during pilot.
- Do not publicly rename Market News to Pulse.
- Do not create a standalone Africa Real Estate Pulse site during this track.
- Do not post generic "Africa is rising" content.
- Do not use fake urgency.
- Do not imply price movement, yield, liquidity, or returns unless backed by verified data and reviewed by a human.

## 11. Risks

- Brand risk: low-hype institutional tone can be damaged quickly by generic AI social copy.
- Hallucination risk: currently low because no LLM is wired; rises when ChatGPT/Claude drafting is added.
- Overclaiming risk: high if "why it matters" becomes a prediction rather than context.
- API/token risk: currently low because no social APIs are connected; future tokens must stay server-side.
- Accidental publishing risk: currently low; rises with scheduling integrations.
- Copyright/source risk: do not republish full article text; link and summarize with attribution.
- Spam perception risk: posting too often or using generic hashtags would weaken trust.
- Weak analytics risk: current measurement cannot prove which item or format drove newsletter signup or site traffic.
- KazaVerde/AREI naming confusion: current footer links use KazaVerde social handles, while strategy is moving toward Cape Verde Real Estate Index / AREI framing. Do not add public Pulse naming until brand cleanup is decided.
- Admin data exposure risk: `content_drafts` anon read/write policies are too broad for mature editorial drafts.

## 12. Recommendations

### A. Ready now

- Use the existing admin approval queue concept as the control pattern.
- Run a manual Phase 0 outside publishing using 5 Cape Verde Market News items.
- Keep publishing disabled in AREI Admin.
- Use manual spreadsheets or markdown for first output comparison if code is not yet changed.

### B. Must fix before live test

- Add a Market News social draft schema separate from listing `content_drafts`, or extend drafts with a `draft_type` and market-news fields.
- Store source name, source URL, Market News item ID, country, category, tags, and fact/interpretation fields with each draft.
- Add editable draft copy before approval.
- Add per-platform variants for Instagram feed, Instagram story, carousel, LinkedIn, and X.
- Add explicit source/context display in the approval UI.
- Tighten draft storage access. Do not leave mature editorial drafts directly writable by anon clients.
- Confirm the actual public `/market-news` route and URL before posts link to it.

### C. Should fix soon

- Add regenerate flow with revision instruction.
- Add audit fields: created_by, reviewed_by, approved_at, rejected_at, model/provider, prompt_version.
- Add UTM conventions to draft output.
- Capture UTM/referrer metadata for newsletter signups.
- Add a basic safety checklist to every draft: no advice, no overclaim, source present, fact/interpretation separated.
- Add model comparison storage for Phase 0.

### D. Optional later

- Typefully integration for approved scheduling.
- Native LinkedIn/Meta/X integrations.
- Platform analytics ingestion.
- Carousel image generation or template export.
- Cross-market dashboard after Cape Verde validation.

### E. Do not do yet

- Do not auto-publish.
- Do not connect new social accounts during the audit/planning phase.
- Do not create a standalone Africa Real Estate Pulse site.
- Do not expand to Ghana, Kenya, Nigeria, Morocco, Senegal, or other markets.
- Do not publicly rename Market News to Pulse.
- Do not create spam workflows, engagement bots, auto-comments, or auto-replies.
- Do not run paid promotion before organic signal exists.

## 13. Recommended Next Implementation Prompt

```text
Implement the Phase 0 Market News social draft workflow inside AREI Admin.

Scope:
- Do not publish or schedule anything.
- Do not connect social APIs.
- Keep Cape Verde only.
- Do not create a standalone Pulse site or public Pulse branding.

Build:
- Add a market-intelligence social draft type that can be created from reviewed Cape Verde Market News items.
- Store title, what_happened, why_it_matters, source_name, source_url, country, region, category, tags, market_news_status, review_status, and source item ID.
- Generate platform variants for Instagram feed caption, Instagram story 3-frame text, carousel outline, LinkedIn post, and X post.
- Preserve fact vs interpretation.
- Add editable draft fields and approval states: pending, approved, rejected, revision_requested.
- Add source/context display in the approval UI.
- Add no-publish guardrails in UI and code.
- Add optional ChatGPT vs Claude comparison for Phase 0 only, using server-side API calls and storing model/provider/prompt_version.
- Add tests or a dry-run script using 5 existing Cape Verde Market News items.

Acceptance:
- No external social API calls exist.
- No auto-publishing or scheduling exists.
- Drafts are human-reviewable and editable.
- Every draft preserves source name and source URL.
- Every output follows AREI's institutional, investor-facing, low-hype tone.
```
