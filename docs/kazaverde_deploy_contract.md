# KazaVerde Deploy Contract

## Canonical production

- Production domain: `https://kazaverde.com`
- Preview/test domain: `https://<project>.vercel.app`
- `*.vercel.app` is never considered production success

## Mapping

- Repo: `africapropertyindex.v4`
- App path: `/kazaverde-web`
- Production project: `kazaverde-web`

## Release success criteria

A deploy is only successful when:

1. the Vercel build passes
2. the correct custom domain is attached to the `kazaverde-web` production deployment
3. the intended change is verified live on `https://kazaverde.com`

## Validation

- Check the relevant page on `https://kazaverde.com`
- Confirm the intended change is visible there
- Confirm a preview URL was not mistaken for production
- Confirm `kazaverde.com` is still attached to `kazaverde-web`
- Confirm canonical production assumptions still point to `kazaverde.com`

## Deploy reporting rule

All deploy reports for KazaVerde must separately state:

- `Vercel deploy URL`
- `Production project: kazaverde-web`
- `Production domain: https://kazaverde.com`
- `kazaverde.com verification status: verified | not verified`
- `Verification note`
