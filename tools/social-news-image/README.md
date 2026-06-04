# AREI Instagram news-post — direction explorer (prototype)

Renders the same example headline in four visual directions at 1080×1350
(Instagram portrait) so a direction can be chosen by looking, not guessing.

- `render.js` — SVG → PNG via `@resvg/resvg-js` with real IBM Plex Mono.
- Directions: A strict typographic · B editorial split · C full-bleed+overlay · D punchy caption-card.
- Photo/AI zones are labelled placeholders (no image API wired in this repo yet).

## Run
```
npm install @resvg/resvg-js@^2.6.2
# place IBM Plex Mono 400/500/600 TTFs in fonts/ (fontsource latin-*-normal.ttf)
node render.js   # writes out/A.png … out/D.png
```

Recommendation: D as the workhorse for text-only news, B when a muted photo/AI
image is available. C is discouraged (brand overlay kills the image).
