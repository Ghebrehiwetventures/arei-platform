# arei-broker — Vercel Staging Deployment

**Status:** Ready to deploy  
**App:** `arei-broker/` (broker workspace pilot)  
**Working product name:** Listo by AREI *(working name only — do not use as the public URL)*  
**Last updated:** 2026-05-13

---

## Purpose of the staging deployment

The staging deployment is an internal preview of the broker workspace for:

- AREI pilot team to test with demo agency data before showing to real agencies
- Pre-agency-meeting dry runs (the app points to the live Supabase demo seed)
- Cross-device testing (mobile-first UX must be verified on real phones)
- Sharing a URL with trusted reviewers without requiring localhost

This is **not** the production URL. It will not be shared with agencies until the working product name is confirmed, auth is in place, and the V1 checklist is signed off.

### Why not `listo.arei.io` yet

"Listo by AREI" is a working product name only. The final name depends on:
- Domain availability
- Trademark checks across target markets
- Language checks (Cabo Verde Portuguese, English, French)
- Agency feedback from the pilot

Staging uses a neutral technical URL (`arei-broker-staging.vercel.app` or similar) that makes no brand commitment.

---

## Vercel project settings

Create a new project in the Vercel dashboard. Use these exact settings:

| Setting | Value |
|---|---|
| **Project name** | `arei-broker` |
| **Root Directory** | `arei-broker` |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` (Vercel default) |
| **Node.js Version** | 20 |

> Root Directory **must** be set to `arei-broker`. Vercel will then run the build from inside that directory, so `package.json`, `vite.config.ts`, and `vercel.json` are all correctly resolved.

### Why `framework: null` in vercel.json

`vite.config.ts` uses `envDir: ".."`, which tells Vite to look for `.env` files one level up from `arei-broker/`. In local dev, that's the worktree root. On Vercel, env vars are injected into `process.env` at build time — Vite picks up `VITE_*` prefixed variables from `process.env` regardless of `envDir`. So the staging build will read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` correctly from Vercel's environment variable dashboard without any config change.

---

## vercel.json

Already committed at `arei-broker/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

The `rewrites` rule makes React Router work correctly — all routes (`/`, `/listings`, `/website`, etc.) resolve to `index.html` and are handled client-side.

---

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables**.

Scope: **Preview** and **Production** (for staging, Preview is sufficient).

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |

These are the only two variables the app requires. Both are safe to use as browser-visible anon keys — they are not secrets.

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project. That key is for local CLI use only and must never be exposed in a frontend build.

---

## Step-by-step deployment

### 1. Create the Vercel project

```
Vercel Dashboard → Add New Project → Import Git Repository
→ Select: Ghebrehiwetventures/arei-platform
→ Root Directory: arei-broker
→ Framework Preset: Other
→ Build Command: npm run build
→ Output Directory: dist
→ Project Name: arei-broker
→ Deploy
```

### 2. Set environment variables

In the newly created project:
```
Settings → Environment Variables
→ Add: VITE_SUPABASE_URL      = <value from .env.local>
→ Add: VITE_SUPABASE_ANON_KEY = <value from .env.local>
→ Environment: Preview + Production
→ Save
```

### 3. Trigger a deployment

Either:
- Push any commit to `main` (Vercel auto-deploys on push)
- Or: Vercel Dashboard → Deployments → Redeploy

### 4. Confirm staging URL

Vercel will assign a URL such as:
- `arei-broker.vercel.app`
- `arei-broker-git-main-ghebrehiwetventures.vercel.app`

This is the internal staging URL. Do not share it publicly.

### 5. Optional: set a custom staging domain

If a neutral staging domain is preferred over the auto-generated URL, add a custom domain in Vercel → Settings → Domains:
- `broker-staging.arei.io` — clear internal staging label
- `agency-staging.arei.io` — more generic option
- Avoid `listo.*` until name is confirmed

---

## Post-deploy test checklist

Run through these after each staging deployment. Test on both desktop and a real mobile device (iPhone or Android).

### Navigation and loading

- [ ] App loads at staging URL — no blank screen, no console errors
- [ ] All 5 nav tabs are visible: Inbox, Listings, Website, Performance, Profile
- [ ] No admin sidebar, no admin chrome, no internal admin labels visible

### Inbox

- [ ] Inbox loads with demo leads (should show 8 leads, "Inbox (3 new)")
- [ ] Status filter tabs work: All / New / Contacted / Viewing Booked / Negotiating / Lost / Closed
- [ ] Selecting a lead opens the detail panel on the right
- [ ] Lead detail shows: buyer name, email/phone, message, WhatsApp button, status buttons, follow-up date, notes
- [ ] WhatsApp button renders with correct `wa.me` URL format
- [ ] Updating lead status saves (no console error)
- [ ] Follow-up date and notes save correctly

### Listings

- [ ] Listings page loads with demo listings (should show 9 listings)
- [ ] Grid shows: title, price, status badge, location, photo
- [ ] "+ Add listing" button opens the create form
- [ ] Create form: all fields accept input
- [ ] Save creates a new listing that appears in the grid
- [ ] Clicking a listing opens the detail page
- [ ] Edit mode opens form pre-filled with current values
- [ ] "Submit for Review" button only enabled when required quality hints pass
- [ ] Published listing shows "Published ✓" with correct copy
- [ ] No reviewer_notes, reviewed_by, or reviewed_at visible anywhere

### Website

- [ ] Website page loads with agency name, description, and contact buttons
- [ ] Only `publish_status = 'published'` listings appear — drafts hidden
- [ ] WhatsApp CTA button renders
- [ ] Email and Phone buttons render
- [ ] Page is readable and usable on a 390px mobile screen

### Performance

- [ ] Performance page loads without error
- [ ] 4 "Coming soon" stat tiles visible, greyed out
- [ ] "Leads by listing" section shows real data (listings with lead counts)
- [ ] Demo test listing "Modern 2-bedroom villa — Murdeira, Sal" shows 1 lead

### Profile

- [ ] Profile page loads with Archipelago Real Estate demo agency info
- [ ] Edit form fields are populated
- [ ] Save works without console error

### Security spot-check

- [ ] Open browser devtools → Network → no requests to admin-only Supabase tables (`agency_relationships`, `listing_data_issues`, `agency_data_quality_snapshots`)
- [ ] Open devtools → Console → no `SUPABASE_SERVICE_ROLE_KEY` in any logged output
- [ ] No internal fields in any visible UI text

---

## Build facts (for reference)

Confirmed clean build from `arei-broker/` (no install required, uses existing `node_modules`):

```
vite v5.4.21 building for production...
✓ 89 modules transformed.
dist/index.html                   0.75 kB  │ gzip:   0.44 kB
dist/assets/index-*.css          15.71 kB  │ gzip:   3.95 kB
dist/assets/index-*.js          422.48 kB  │ gzip: 116.73 kB
✓ built in ~600ms
```

No errors. No TypeScript errors. No warnings. Bundle size is well within Vite's 500 kB chunk limit with no code-splitting required at this stage.

---

## Related documents

- `docs/03-product/listo-by-arei-product-brief.md` — full product brief, naming caveat, V0 features
- `docs/03-product/broker-tool-competitive-landscape-2026.md` — competitive research, positioning
- `docs/04-platform/broker-product-architecture.md` — surface separation, data boundary, auth model
- `docs/04-platform/vercel-deploy.md` — existing Vercel runbook for kazaverde-web
- `docs/03-product/broker-pilot-demo-setup.md` — how to apply migrations and seed data
