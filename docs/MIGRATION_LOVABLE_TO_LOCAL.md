# Migration: Lovable → Local (Africa Property Index)

**Mål:** Ladda ner frontend från Lovable, arbeta lokalt, deploya till Vercel.  
**Risk:** Inga country-specific tweaks – behåll genericitet.

---

## Fas 1: Export från Lovable

### Metod A: GitHub (rekommenderat)
1. Öppna projektet i Lovable
2. Klicka GitHub-ikonen (övre högra hörnet)
3. Anslut GitHub-konto
4. **View Code** → **Download ZIP** eller klona repo

### Metod B: ZIP-export
1. Projekt Settings → **Export** / **Download**
2. Spara ZIP till `~/Downloads/` eller liknande
3. Packa upp

### Verifiera export
- [ ] Saknas inga filer? (src/, package.json, etc.)
- [ ] Finns Lovable-specifika hooks? Sök: `lovable`, `gpt-engineer`, `useLovable`
- [ ] Vilken stack? (React/Vite eller Next.js – avgör deploy-strategi)

**Utmaning:** Kontrollera att export inte introducerar dolda kopplingar till Lovable-proprietär API.

---

## Fas 2: Setup lokalt

### Plats i projektet

Historical note:
- `web/` was later archived to `archive/web/` because it was only a placeholder and not an active app.
- If this migration path is revived, restore or recreate a dedicated frontend staging directory intentionally.

```
(projektrot)/
  archive/web/  ← historisk placeholder, ej aktiv app
  core/         ← Pipeline (oförändrad)
  markets/      ← YAML (oförändrad)
```

### Steg
```bash
# 1. Skapa separat staging-dir och extrahera
mkdir -p frontend-import
unzip lovable-export.zip -d frontend-import/
# ELLER: om export är flat, flytta innehållet till frontend-import/

# 2. Installera dependencies
cd frontend-import && npm install

# 3. Skapa .env (kopiera från .env.example om finns)
cp .env.example .env
# Fyll i: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (eller motsvarande)

# 4. Köra lokalt
npm run dev
```

### Testa alla sidor
- [ ] Home
- [ ] Listings (lista)
- [ ] Listings (karta)
- [ ] Articles
- [ ] About
- [ ] API-anrop fungerar (Supabase, etc.)

**Genericitet:** API-anrop ska vara market-agnostiska – ingen hårdkodad `market_id: "cv"` etc.

---

## Fas 3: Clean & Adapt

### Ta bort Lovable-artefakter
```bash
# Sök efter Lovable-specifikt
grep -r "lovable\|gpt-engineer" frontend-import/
```

- [ ] Ta bort Lovable-branding
- [ ] Ta bort proprietary hooks/imports
- [ ] Ta bort .lovable/ eller liknande config-dir

### Adapt till standard
- [ ] Om Vite: behåll eller migrera till Next.js vid behov
- [ ] Ingen nya features – read-only demo
- [ ] Pipeline-integration: UI ska läsa från Supabase, **ingen** UI-specifik hack för marknader

### Förbjudet
- ❌ `if (market === "cv")` i UI-kod
- ❌ Hårdkodade land-/källistor
- ❌ Country-specific layout/design

---

## Fas 4: Deploy till Vercel

### Setup
1. **Vercel CLI:** `npm i -g vercel`
2. **Connect repo:** Vercel Dashboard → Import Project → africa-property-index
3. **Root Directory:** Sätt till frontendens faktiska katalog
4. **Framework Preset:** Vite eller Next.js (auto-detect)
5. **Build command:** `npm run build` (default)
6. **Output directory:** `dist` (Vite) eller `.next` (Next.js)

### Environment variables
| Variable | Källa |
|---------|-------|
| `VITE_SUPABASE_URL` | Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings |

### Test live
- [ ] Alla sidor laddar
- [ ] Listings visas (multi-country)
- [ ] Karta fungerar
- [ ] Inga 404/500

**Skalbarhet:** Byter man marknad i UI (om dropdown finns) ska data uppdateras utan deploy – ingen kodändring.

---

## Checklista innan merge

- [ ] Inga Lovable-dependencies kvar
- [ ] Genericitet: UI fungerar för alla 5 marknader utan kodändring
- [ ] Read-only: ingen monetisering/lead-gen ännu
- [ ] Pipeline = YAML-only, inga UI-hacks

---

## Noteringar

- **Lovable export:** Vanligtvis React + Vite. Next.js om backend ingår.
- **Supabase:** Lovable-projekt använder ofta Supabase – samma som Africa Property Index pipeline.
- **Env vars:** Supabase-nycklar ska vara samma som i projektet (samma DB).
