# Vercel deploy (KazaVerde monorepo)

Last updated: 2026-03-21

## Governing reference

This runbook is governed by `docs/06-go-to-market/brand-architecture.md`.

Naming layers for this runbook:
- canonical parent platform: `AREI`
- canonical consumer surface: `KazaVerde`
- technical Vercel project: `kazaverde-web`
- technical shared package: `packages/arei-sdk`
- public production domain: `https://kazaverde.com`
- default endorsement language: `Powered by AREI`

`kazaverde-web` is the deployment identifier for KazaVerde in Vercel. It is not the public product name.

## Rekommenderad konfiguration (Lösning 1)

Bygg körs från **repo root** så att `packages/arei-sdk` finns under build.

### I tekniska Vercel-projektet (`kazaverde-web`) → Settings → General

| Inställning | Värde |
|-------------|--------|
| **Root Directory** | *Tom* (lämna blankt) — så att repo root används |
| **Build Command** | Överskrids av `vercel.json` i repo root |
| **Output Directory** | Överskrids av `vercel.json` → `kazaverde-web/dist` |

### Övrigt i Vercel

- **Node.js Version**: 18 eller 20
- **Environment Variables** (Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Install Command**: default (`npm install`)

### Lokal deploy från repo root

```bash
cd /Users/ghebrehiwet/morabesa
npx vercel link   # välj projekt kazaverde-web för KazaVerde
npx vercel deploy --yes
npx vercel deploy --prod   # production
```

---

Om Root Directory istället är `kazaverde-web` används `kazaverde-web/vercel.json`; då finns inte `../packages/arei-sdk` i bygget och deploy fallerar.
