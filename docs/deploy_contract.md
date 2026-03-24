# Deploy Contract

This file is the canonical deploy contract for the public web surfaces.

## Public surfaces

- `africapropertyindex-landing` -> `https://www.africarealestateindex.com`
- `kazaverde-web` -> `https://www.kazaverde.com`

## Allowed deploy folders

- `web/prototypes` may deploy only to `africapropertyindex-landing`
- repo root (`.`) may deploy only to `kazaverde-web`

## Allowed commands

- Landing page: `npm run deploy:landing`
- KazaVerde app: `npm run deploy:kazaverde`

Do not use raw `vercel deploy` commands for these surfaces. Use the guarded commands above.
