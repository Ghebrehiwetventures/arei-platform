# Deploy admin to Vercel

## 1. Connect repo

- Vercel → New Project → Import your repo.
- Set **Root Directory** to `diagnostics` (so build and API use this folder).

## 2. Environment variables

In Vercel: Project → Settings → Environment Variables. Add:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_ADMIN_PROTECTED` | `true` to enable password protection |
| `ADMIN_PASSWORD` | The password users enter to log in |
| `ADMIN_SESSION_SECRET` | Random string (e.g. `openssl rand -hex 24`) for the session cookie |

Optional:

- `VITE_GITHUB_ACTIONS_URL` — link to GitHub Actions for "Open GitHub Actions" on Dashboard.

## 3. Deploy

### Auto-deploy on push to main (Git)

Så att **push till main på GitHub** triggar build och deploy automatiskt:

1. **Vercel** → ditt projekt **africapropertyindexadmin** → **Settings** → **Git**.
2. Om repot inte är kopplat: **Connect Git Repository** → välj **GitHub** och repot (t.ex. `Ghebrehiwetventures/africapropertyindex.v4`).
3. Under **Root Directory** ange **`diagnostics`** (projektets rot är `morabesa`, appen ligger i `diagnostics/`). Spara.
4. **Production Branch** ska vara **main**.
5. Gör en **push till main** – Vercel bygger och deployar. Status: **Deployments** eller i GitHub (om Vercel-appen är installerad).

Efter det: **Commit & push till main** → Vercel kör build och uppdaterar production.

### Deploy från CLI

**From CLI (e.g. from Cursor):** Run from the `diagnostics` folder:

```bash
cd diagnostics
npx vercel --prod
```

If you get an error like `path "…/diagnostics/diagnostics" does not exist`, the project was set up with Root Directory = `diagnostics` for repo-based deploys. When deploying from inside `diagnostics`, change it: Vercel → Project → **Settings** → **General** → **Root Directory** → set to **`.`** (or leave empty), then save. After that, `npx vercel --prod` from `diagnostics` works.

**From Git:** Push to main or trigger deploy in the Vercel dashboard. If the repo root is `morabesa`, keep Root Directory = `diagnostics` in project settings.

The build runs `npm run build` and serves the `dist` folder. The `/api/auth` route is a serverless function for login. On Vercel, `../artifacts` is not available, so the build uses `public/` as fallback; the app still works (sync report will show "no report" until you add one via another channel).

**If the main URL doesn’t work:** In Vercel → Deployments, open the latest production deployment and use the deployment URL (e.g. `…-ghebrehiwetventures.vercel.app`) to test. Ensure the project’s production domain is set (Settings → Domains). Redeploy after any `vercel.json` or build fix.

## 4. Password protection

- If `VITE_ADMIN_PROTECTED` is not `true`, the app is open (no login).
- If `VITE_ADMIN_PROTECTED=true`, the first screen is a login form; after a correct password, a cookie is set and the admin is shown.

**Yes, we need a password (or similar)** when the admin is public. Use the env vars above so only people with `ADMIN_PASSWORD` can access.
