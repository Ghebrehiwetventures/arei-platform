# Deploy AREI Admin to Vercel

Last updated: 2026-03-21

## Governing reference

This runbook is governed by `docs/06-go-to-market/brand-architecture.md`.

Naming layers for this runbook:
- canonical parent platform: `AREI`
- canonical internal product: `AREI Admin`
- technical repo identifier: `arei-platform`
- technical app path: `arei-admin/`
- technical Vercel project: `arei-admin`
- public branding: internal-only operational surface

`AREI Admin` is the product name. `arei-admin` is the technical app and deployment identifier.

## 1. Connect repo

- Vercel → New Project → Import your repo.
- Set **Root Directory** to `arei-admin` and keep it there permanently.
- Set **Framework Preset** to **Other**.
- Do not leave Root Directory blank and do not point it at the old `diagnostics` path.

## 2. Environment variables

In Vercel: Project → Settings → Environment Variables. Add:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_ADMIN_PROTECTED` | Optional. Set to `false` only if you intentionally want to disable protection. Production should remain protected. |
| `ADMIN_PASSWORD` | The password users enter to log in |
| `ADMIN_SESSION_SECRET` | Random string (e.g. `openssl rand -hex 24`) for the session cookie |

Production Market Social API requests fail closed when `ADMIN_SESSION_SECRET` is missing. Keep this variable set in production before deployed E2E.

Optional:

- `VITE_GITHUB_ACTIONS_URL` — link to GitHub Actions for "Open GitHub Actions" on Dashboard.

Market News social drafting / publishing:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL for server-side admin API access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase service-role key. Never expose to browser clients. |
| `OPENAI_API_KEY` | Optional. Enables OpenAI/ChatGPT social draft generation. |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini`. |
| `ANTHROPIC_API_KEY` | Optional. Enables Claude social draft generation. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-3-5-sonnet-latest`. |
| `INSTAGRAM_ACCESS_TOKEN` or `META_ACCESS_TOKEN` | Optional. Enables server-side Instagram publishing. |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_IG_USER_ID`, or `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` | Optional. Instagram professional account ID used by Graph API publishing. |
| `INSTAGRAM_GRAPH_API_VERSION` | Optional. Defaults to `v20.0`. |
| `INSTAGRAM_DEFAULT_IMAGE_URL` | Optional. Public image URL used when an Instagram feed draft has no media URL. |

Before deployed Market Social E2E, apply `migrations/024_market_news_social_drafts.sql` and verify RLS/no public policies using the checklist in `docs/03-product/social-agent-market-intelligence-implementation.md`.

## 3. Deploy

### Auto-deploy on push to main (Git)

Så att **push till main på GitHub** triggar build och deploy automatiskt:

1. **Vercel** → ditt projekt **arei-admin** → **Settings** → **Git**.
2. Om repot inte är kopplat: **Connect Git Repository** → välj **GitHub** och repot (t.ex. `Ghebrehiwetventures/arei-platform`).
3. Under **Root Directory** ange **`arei-admin`** (repo root är monorepo-roten, appen ligger i `arei-admin/`). Spara.
4. Under **Framework Preset** välj **Other**.
5. **Production Branch** ska vara **main**.
6. Gör en **push till main** – Vercel bygger och deployar. Status: **Deployments** eller i GitHub (om Vercel-appen är installerad).

Efter det: **Commit & push till main** → Vercel kör build och uppdaterar production.

### Deploy från CLI

**Canonical rule:** use the same root assumption everywhere. Keep the Vercel project configured with **Root Directory = `arei-admin`** and run CLI deploys from the repo root.

```bash
cd /Users/ghebrehiwet/morabesa
npx vercel --prod
```

If you deploy from inside `arei-admin` while the Vercel project also has **Root Directory = `arei-admin`**, Vercel can effectively resolve `arei-admin/arei-admin` and fail. Avoid changing the dashboard setting just to satisfy one CLI workflow; that creates drift and is exactly how intermittent mis-detection starts.

**From Git:** Push to main or trigger deploy in the Vercel dashboard. Keep **Root Directory = `arei-admin`** in project settings.

The build runs `npm run build` and serves the `dist` folder. The `/api/auth` route is a serverless function for login. On Vercel, `../artifacts` is not available, so the build uses `public/` as fallback; the app still works (sync report will show "no report" until you add one via another channel).

**If the main URL doesn’t work:** In Vercel → Deployments, open the latest production deployment and use the deployment URL (e.g. `…-ghebrehiwetventures.vercel.app`) to test. Ensure the project’s production domain is set (Settings → Domains). Redeploy after any `vercel.json` or build fix.

## 3. Permanent Vercel settings

For the `arei-admin` project, keep these values stable:

| Setting | Value |
|----------|-------|
| Root Directory | `arei-admin` |
| Framework Preset | `Other` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20 |
| Production Branch | `main` |

The repo root has a separate [`vercel.json`](/Users/ghebrehiwet/morabesa/vercel.json) for KazaVerde, whose technical Vercel project identifier is `kazaverde-web`. If Root Directory is blank for the admin project, Vercel will read the wrong config and build the wrong app.

## 4. Guardrails

- Run `npm run check:arei-admin-deploy` from the repo root before changing admin deploy settings.
- Keep [`arei-admin/vercel.json`](/Users/ghebrehiwet/morabesa/arei-admin/vercel.json) authoritative for admin deploy behavior.
- Keep `arei-admin` free of Next.js dependencies unless the app is intentionally migrated to Next.js.
- Treat any rename from `arei-admin` as a Vercel project-settings change, not just a git rename.
- Do not treat the Vercel project identifier as public branding. `AREI Admin` remains the canonical product name.

## 5. Password protection

- Outside local development, the admin is protected by default unless `VITE_ADMIN_PROTECTED=false` is set explicitly.
- When protection is enabled, the first screen is a login form; after a correct password, a cookie is set and the admin is shown.

**Yes, we need a password (or similar)** when the admin is public. Use the env vars above so only people with `ADMIN_PASSWORD` can access.
