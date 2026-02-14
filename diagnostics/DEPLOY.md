# Deploy admin to Vercel

1. Push this repo to GitHub (if not already).
2. In Vercel: New Project → Import the repo.
3. **Root Directory:** Set to `diagnostics` (so Vercel uses this folder as the project root).
4. **Env vars** (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `ADMIN_PASSWORD` = your chosen admin password (for Basic Auth; if unset, no protection)
5. Deploy. The site will be at `https://<project>.vercel.app`. Browser will prompt for the password when `ADMIN_PASSWORD` is set.

**Optional (Pro/Enterprise):** Skip middleware and use Vercel’s built-in Password Protection in Project → Settings → Deployment Protection instead.
