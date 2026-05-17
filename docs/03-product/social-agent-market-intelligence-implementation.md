# Social Agent Market Intelligence Implementation

Last updated: 2026-05-15

## What was implemented

AREI Admin now has a Cape Verde Market News social draft workflow:

1. Load Cape Verde `market_news` items through a protected server-side admin route.
2. Generate platform-specific social draft variants with a configured LLM provider.
3. Store source-preserving social draft rows in `market_news_social_drafts`.
4. Edit, copy, approve, reject, or reset each draft in AREI Admin.
5. Publish only an approved Instagram feed caption through a server-side Instagram Graph API connector when configured.
6. Record publish attempt, success, external post ID/permalink, or failure message.

This does not create a standalone Pulse site, does not expand beyond Cape Verde, and does not add LinkedIn/X auto-publishing or scheduling.

## Admin flow

Open AREI Admin and choose `Market Social`.

The workflow is:

- select a Cape Verde Market News item
- review source context, source URL, what happened, and why it matters
- choose LLM provider or safe default
- optionally provide an Instagram media URL
- generate social drafts
- edit each platform variant
- save edits
- approve the Instagram feed caption
- publish to Instagram if configured, or copy manually if not configured

Editing an approved draft resets approval before publishing unless the text is unchanged. Published drafts cannot be edited.

## Storage

Migration:

- `migrations/040_market_news_social_drafts.sql`

New table:

- `public.market_news_social_drafts`

The table stores one row per generated platform variant and includes:

- Market News source reference
- source title, source name, source URL
- country, region, category, tags
- factual summary / what happened
- why it matters
- platform and draft type
- generated text and editable text
- approval state and reviewer metadata
- publish status, attempt timestamps, external post ID/permalink, and error message
- model provider, model name, prompt version
- optional media URL for Instagram

RLS is enabled and no anon/authenticated policies are created. The intended access path is the server-side admin API using service-role credentials.

## Server API

Endpoint:

- `arei-admin/api/social-market-news.js`

Actions:

- `GET /api/social-market-news`: loads Market News items, drafts, and provider configuration state.
- `POST { action: "generate" }`: generates and stores platform variants.
- `POST { action: "update" }`: saves edited draft text and resets approval when needed.
- `POST { action: "approve" }`: approves a draft after required source fields are present.
- `POST { action: "reject" }`: rejects a draft.
- `POST { action: "reset" }`: returns a draft to pending review.
- `POST { action: "publish_instagram" }`: publishes only approved Instagram feed captions.

The endpoint uses the existing AREI Admin Supabase Auth model. The browser sends the current logged-in admin user's Supabase access token in an `Authorization: Bearer ...` header. The server verifies the token with Supabase Auth, then checks `admin_users` with the same `user_id` before allowing Market Social actions.

Auth behavior:

- Missing bearer token returns `401`.
- Invalid bearer token returns `401`.
- Valid Supabase user without an `admin_users` row returns `403`.
- Valid Supabase admin user can load items and perform Market Social actions.

`ADMIN_SESSION_SECRET` is not required for the normal deployed Supabase Auth path. If it is configured, the server still accepts the legacy `admin_session` cookie as an alternate server-session path, but the deployed admin app does not depend on that cookie.

## LLM provider behavior

Supported providers:

- OpenAI / ChatGPT
- Anthropic / Claude

Default behavior:

- If both are configured, OpenAI is the default unless the admin selects Claude.
- If only one is configured, that provider is used.
- If neither is configured, generation returns a clear configuration error. No fake draft content is generated.

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, default `gpt-4o-mini`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` optional, default `claude-3-5-sonnet-latest`

Prompt version:

- `market-news-social-v1`

The prompt requires simple English, low-hype institutional tone, source preservation, fact/interpretation separation, no investment advice, and no unsupported price/return claims.

## Instagram publishing

Instagram publishing is server-side only.

Required environment variables:

- `INSTAGRAM_ACCESS_TOKEN` or `META_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_IG_USER_ID`, or `META_INSTAGRAM_BUSINESS_ACCOUNT_ID`

Optional environment variables:

- `INSTAGRAM_GRAPH_API_VERSION`, default `v20.0`
- `INSTAGRAM_DEFAULT_IMAGE_URL`

Instagram feed publishing requires an image. The admin can provide a draft media URL in the UI, or the server can use `INSTAGRAM_DEFAULT_IMAGE_URL`.

Connector behavior:

1. Validates draft is an approved `instagram_feed_caption`.
2. Validates source URL exists.
3. Validates Instagram credentials are configured.
4. Validates an image URL is available.
5. Creates an Instagram media container.
6. Publishes the media container.
7. Attempts to fetch the permalink.
8. Records success or failure in `market_news_social_drafts`.

If credentials or media are missing, the draft remains available for manual copy and publish status records the configuration/error state. The system does not fake success.

## Manual fallback

All generated variants have copy buttons:

- Instagram feed caption
- Instagram story outline
- Instagram carousel outline
- LinkedIn post
- X post

This allows manual go-live even before Instagram credentials and Meta app setup are complete.

## Still requires external setup

- A Meta app with the correct Instagram Graph API permissions.
- A connected Instagram professional account.
- A Facebook Page connected to the Instagram account.
- A long-lived or managed access token suitable for publishing.
- A public image URL for Instagram feed publishing.
- Supabase migration `040_market_news_social_drafts.sql` applied.
- Existing `market_news` table available with usable Cape Verde items and required source fields.

## Migration application checklist

Apply `migrations/040_market_news_social_drafts.sql` from the Supabase SQL editor or an authenticated Supabase/Postgres CLI session. Do not run it from a browser client.

Supabase SQL editor steps:

1. Open Supabase project.
2. Go to SQL Editor.
3. Paste the full contents of `migrations/040_market_news_social_drafts.sql`.
4. Run the script once.
5. Run the verification queries below.

CLI option:

```bash
psql "$DATABASE_URL" -f migrations/040_market_news_social_drafts.sql
```

Confirm table exists:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'market_news_social_drafts';
```

Confirm RLS is enabled:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'market_news_social_drafts';
```

Expected: `rowsecurity = true`.

Confirm no anon/authenticated policies exist:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'market_news_social_drafts';
```

Expected: zero rows.

Confirm indexes exist:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'market_news_social_drafts'
order by indexname;
```

Expected indexes:

- `market_news_social_drafts_pkey`
- `market_news_social_drafts_item_idx`
- `market_news_social_drafts_created_at_idx`
- `market_news_social_drafts_publish_status_idx`

## Production E2E checklist

Before deployed E2E, configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

The admin user used for E2E must be able to sign in through Supabase Auth and must have a row in `admin_users`.

Optional for Instagram API publishing:

- `INSTAGRAM_ACCESS_TOKEN` or `META_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_IG_USER_ID`, or `META_INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_DEFAULT_IMAGE_URL`, unless a draft media URL is entered manually

Deployed E2E steps:

1. Open AREI Admin.
2. Log in through the admin password gate.
3. Open `Market Social`.
4. Confirm Cape Verde Market News items load.
5. Select a valid item with title, source name, source URL, what happened, and why it matters.
6. Generate social drafts.
7. Edit the Instagram feed caption.
8. Save the draft.
9. Approve the draft.
10. Edit the approved draft again and confirm approval resets to pending.
11. Approve the final edited draft.
12. Copy the Instagram caption and confirm clipboard/manual fallback works.
13. In Supabase, verify rows exist:

```sql
select market_news_item_id, draft_type, approval_status, publish_status, source_url, created_at
from public.market_news_social_drafts
order by created_at desc
limit 10;
```

14. Confirm unapproved drafts cannot publish by attempting publish before approval on a fresh or reset Instagram feed draft.
15. If Instagram env vars are not configured, click publish on an approved Instagram feed draft and confirm the UI/API records a clear `not_configured` error.
16. If Instagram env vars are configured, use a controlled test item and public image URL, then verify `publish_status = 'published'` and `external_platform_post_id` or `external_platform_permalink` is stored. If the Graph API fails, verify `publish_status = 'failed'` and `publish_error_message` is stored.

## Out of scope

- No LinkedIn auto-publish.
- No X auto-publish.
- No scheduling.
- No multi-market expansion.
- No standalone Africa Real Estate Pulse site.
- No public Pulse rename.
- No auto-publishing without explicit admin approval.
