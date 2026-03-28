# Africa Property Index – Frontend

**Plats för Lovable-export.**

## Migration

1. Exportera projekt från Lovable (ZIP eller GitHub)
2. Extrahera/packa upp innehållet i denna `web/`-katalog
3. Kör `npm install` och `npm run dev`
4. Se `docs/MIGRATION_LOVABLE_TO_LOCAL.md` för fullständig guide

## Struktur (efter export)

```
web/
  src/
  public/
  package.json
  vite.config.ts   # eller next.config.js
  ...
```

## Krav

- Read-only demo
- Multi-country utan kodändringar
- API = Supabase (samma som pipeline)
