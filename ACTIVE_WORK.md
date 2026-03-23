# Active Work

Detta dokument är den lilla sanningskällan för pågående arbete.
Utgå från branch och status här, inte från minnet av en viss chatt.

## Arbetsregler

- En uppgift = en branch.
- Flera chattar får hjälpa till med samma uppgift, men de ska då arbeta mot samma branch.
- Innan maskinbyte: checkpoint-commit, push, uppdatera detta dokument.
- Innan fortsatt arbete på annan maskin: `git fetch`, `git checkout <branch>`, `git pull`.
- Om en branch innehåller blandat arbete ska det stå uttryckligen här.

## Aktiva Branches

### `main`

- Syfte: stabil baslinje.
- Status: ren referenspunkt.
- Senaste kända commit: `83f85cb`

### `codex/mobile-ui-fixes`

- Syfte: historiskt namn, men branchen innehåller nu blandat arbete.
- Status: checkpoint-branch med flera samtidiga spår.
- Senaste kända commit: `59c9dff`
- Viktigt: använd inte branchnamnet som beskrivning av innehållet.

### `codex/checkpoint-2026-03-23`

- Syfte: tydlig referens till dagens checkpoint.
- Status: samma innehåll som `59c9dff`, men med begripligare namn.
- Användning: säker återupptagning när man behöver hitta dagens samlade läge.

### `codex/arei-landing`

- Syfte: aktiv branch för nya AREI-landningssidan.
- Status: nuvarande arbetsbranch för prototypen och dess copy/layout-justeringar.
- Huvudfil: `web/prototypes/landing-draft.html`
- Viktigt: detta är branchen att fortsätta från för landningssidesarbetet framåt.

## Kända Spår I Checkpointen

### Landningssida

- Branch just nu: `codex/arei-landing`
- Status: prototyp finns och förfinas direkt i prototypfilen.
- Huvudfil: `web/prototypes/landing-draft.html`
- Nästa steg: fortsätt förfina exakt prototypfil och deploya den till rätt landningsprojekt (`africapropertyindex-landing`).

### KazaVerde newsletter popup

- Branch just nu: `codex/mobile-ui-fixes` och `codex/checkpoint-2026-03-23`
- Status: finns i checkpointen.
- Huvudfiler:
  - `kazaverde-web/src/components/NewsletterPopup.tsx`
  - `kazaverde-web/src/components/NewsletterPopup.css`

### Trust / ops / feed-arbete

- Branch just nu: `codex/mobile-ui-fixes` och `codex/checkpoint-2026-03-23`
- Status: flera backend-, migrations- och scriptändringar finns i samma checkpoint.
- Viktigt: behandla detta som ett separat arbetsström framåt, helst på egen branch.

## Rekommenderad Fortsättning

- För landningssidesutveckling: använd `codex/arei-landing`.
- För trust/ops-relaterat arbete: skapa en separat branch med tydligt namn innan nästa större ändring.
- Lämna `codex/checkpoint-2026-03-23` orörd som referenspunkt.
