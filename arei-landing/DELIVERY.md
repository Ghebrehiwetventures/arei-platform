# `arei-landing` Delivery Contract

This document is binding. Any change to `arei-landing/` must satisfy every rule below.

## Canonical project

- Vercel project: `arei-landing` (`prj_4B9hTVACdIa9IdlstS9xzjTdxXow`)
- Team: `ghebrehiwetventures` (`team_92s3lfOnOc8khQBJngloED1z`)
- Repo path: `arei-landing/` (this folder is a self-contained sub-project)

## Deploy model

Deploy is **manual and CLI-driven**, scoped strictly to this folder:

- All deploys run from inside `arei-landing/`. The full monorepo is never uploaded.
- No GitHub git auto-deploy. Merging `main` does not change production by itself.
- Production changes only after explicit `npm run deploy:prod` from `arei-landing/` on a clean `main` checkout.
- `arei-landing/.vercel/project.json` is generated locally by `vercel link` and is gitignored. Never commit it.

## One-time Vercel project setting (REQUIRED before this flow works)

The Vercel project's **Root Directory** must be **empty** (or `./`).

If the dashboard still shows `arei-landing` as the root directory, deploys via this script will fail or build the wrong content.

To change it:
1. Vercel dashboard → project `arei-landing` → Settings → General
2. Find **Root Directory**
3. Clear the value (or set to `./`)
4. Save

This is a one-time operation per project. After this, `vercel.json` and `package.json` inside `arei-landing/` drive the build.

## One-time per checkout

In each git worktree where you intend to deploy from, run once:

```bash
cd arei-landing && npm run deploy:link
```

This creates `arei-landing/.vercel/project.json` (gitignored) linking the folder to the canonical Vercel project. After this, `deploy:preview` and `deploy:prod` work without re-prompting.

## Daily flow

### Preview (before merge)

From the feature branch worktree:

```bash
cd arei-landing
npm run deploy:preview
```

The script refuses to run if `arei-landing/` has uncommitted changes — commit first. Output ends with a `Preview: https://…vercel.app` URL.

**The PR may not be merged unless the preview URL is in the PR body or a top-level comment.** Localhost preview does not count.

### Production (after merge)

Production must come from a clean `main` checkout. Use a dedicated worktree so your feature work isn't disturbed:

```bash
# One-time setup
git worktree add ~/arei-deploy main

# Each prod deploy
cd ~/arei-deploy
git pull origin main
cd arei-landing
npm run deploy:prod
```

The script refuses to run if HEAD is not on `main`. After the deploy, hard-refresh `https://www.africarealestateindex.com/` (`Cmd+Shift+R`) and verify.

## Pre-merge checklist (binding)

- [ ] Preview URL from `npm run deploy:preview` attached to PR body or top-level comment
- [ ] Preview tested at mobile (375px) and desktop (≥1280px)
- [ ] No console errors; Supabase listings load (KazaVerde carousel)
- [ ] Form `action` still points to Formspree `/f/mvzbknjb`
- [ ] Meta: `<title>`, `description`, `og:title`, `og:description` match the new copy
- [ ] If hero copy changed: `arei-og.png` regenerated and looks right at 1200×630
- [ ] Canonical host is consistent across `<link rel="canonical">`, `og:url`, sitemap, and share image references
- [ ] Commit author email is a real address (`name@domain.tld`) — Vercel rejects `*@*.local`

## Canonical URL rules

- The canonical public URL is exactly **`https://www.africarealestateindex.com/`** (with `www`).
- The apex `africarealestateindex.com` is an alias only. It must never appear in `<link rel="canonical">`, `og:url`, `twitter:*` URL refs, sitemap entries, share links, or docs.
- All `<link rel="canonical">`, `og:url`, sitemap entries, and share image references must use the canonical host consistently.

## OG cache refresh (after prod)

If social preview needs to refresh:

- Facebook Sharing Debugger
- Twitter Card Validator
- LinkedIn Post Inspector

## Structure audit

**Current**: single `arei-landing/index.html`, embedded CSS and JS. Build step is `cp index.html arei-og.png dist/`.

**Recommendation: keep as a single file.**

Reasons:
- At this size it's still scannable. Section comments (`/* ─── HERO ─── */` etc.) make navigation cheap.
- No framework, no bundler, no build cache. Deploys are instant.
- JS is tightly coupled to the DOM — splitting it doesn't buy modularity, it just adds a file to keep in sync.
- Single editor. Splitting to help concurrent contributors solves a problem that doesn't exist yet.

**Split only when one of these becomes true:**
- Total file size exceeds ~1,500 lines **or** ~70 KB.
- A second contributor lands changes regularly.
- A third JS-heavy feature is added (e.g., interactive map, chart, search widget).

**If splitting, minimum viable layout (no more):**

```
arei-landing/
  index.html       ← markup + <link>/<script> tags only
  styles.css       ← current CSS block verbatim
  app.js           ← current JS block verbatim
  arei-og.png
  package.json     ← `cp *.html *.css *.js *.png dist/`
  vercel.json
```

No framework. No TypeScript. No bundler. The build stays a `cp`.
