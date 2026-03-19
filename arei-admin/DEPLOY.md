# Deploy admin to Vercel

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

Optional:

- `VITE_GITHUB_ACTIONS_URL` — link to GitHub Actions for "Open GitHub Actions" on Dashboard.

## 3. Deploy

### Auto-deploy on push to main (Git)

Så att **push till main på GitHub** triggar build och deploy automatiskt:

1. **Vercel** → ditt projekt **arei-admin** → **Settings** → **Git**.
2. Om repot inte är kopplat: **Connect Git Repository** → välj **GitHub** och repot (t.ex. `Ghebrehiwetventures/africapropertyindex.v4`).
3. Under **Root Directory** ange **`arei-admin`** (projektets rot är `morabesa`, appen ligger i `arei-admin/`). Spara.
4. Under **Framework Preset** välj **Other**.
5. **Production Branch** ska vara **main**.
5. Gör en **push till main** – Vercel bygger och deployar. Status: **Deployments** eller i GitHub (om Vercel-appen är installerad).

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

The repo root has a separate [`vercel.json`](/Users/ghebrehiwet/morabesa/vercel.json) for `kazaverde-web`. If Root Directory is blank for the admin project, Vercel will read the wrong config and build the wrong app.

## 4. Guardrails

- Run `npm run check:arei-admin-deploy` from the repo root before changing admin deploy settings.
- Keep [`arei-admin/vercel.json`](/Users/ghebrehiwet/morabesa/arei-admin/vercel.json) authoritative for admin deploy behavior.
- Keep `arei-admin` free of Next.js dependencies unless the app is intentionally migrated to Next.js.
- Treat any rename from `arei-admin` as a Vercel project-settings change, not just a git rename.

## 5. Password protection

- Outside local development, the admin is protected by default unless `VITE_ADMIN_PROTECTED=false` is set explicitly.
- When protection is enabled, the first screen is a login form; after a correct password, a cookie is set and the admin is shown.

**Yes, we need a password (or similar)** when the admin is public. Use the env vars above so only people with `ADMIN_PASSWORD` can access.
