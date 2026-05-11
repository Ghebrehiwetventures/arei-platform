# Local Env Setup for Worktrees

## Why worktrees don't ship with `.env.local`

`.env.local` files are gitignored and never enter version control. They hold
local development secrets (Supabase keys, API tokens, signing keys). When you
create a new worktree, no `.env.local` files exist — apps that need them fail
to start until you provide them.

**Working in `main` is not the workaround.** A `.env.local` in `main` would
either:
- leak secrets if accidentally committed, or
- get re-deleted by every fresh worktree.

Worktrees are the supported development surface. Provide env files the right
way: keep one private copy on your machine, outside the repo, and symlink it
in.

## One-time setup on a new machine

Pick a stable location outside the repo for your private dev env files:

```
~/.arei/env/
├── kazaverde-web.env.local
└── arei-admin.env.local
```

Create them once. Each app's expected variables are documented in its
`.env.example` where one exists:

```
mkdir -p ~/.arei/env
cp kazaverde-web/.env.example ~/.arei/env/kazaverde-web.env.local
# then edit ~/.arei/env/kazaverde-web.env.local and fill in real dev values
```

If an app has no `.env.example` yet, ask the team for the keys it expects,
then create the private file by hand. Do **not** add a `.env.example` with
real values — the example file is committed and must contain only
placeholders.

## Per-worktree: run the setup script

After cloning a new worktree, from the worktree root:

```
./scripts/setup-local-env.sh
```

The script:
- looks for each private file in `~/.arei/env/`
- symlinks it into the worktree at `<app>/.env.local`
- prints `[ok]` for each linked file, `[need]` with create instructions for
  any missing private file, and `[skip]` for apps that don't exist in this
  worktree
- never prints secret values
- is safe to re-run — existing symlinks are replaced atomically; a real file
  (non-symlink) at `<app>/.env.local` is left untouched

After the script reports `[ok]` for the app you need, the dev server can
start normally:

```
npm --prefix kazaverde-web run dev
```

## Rules

1. **Never commit `.env.local`.** It is already in `.gitignore` for each app.
   If `git status` ever shows `.env.local`, stop and investigate.
2. **Never put real values in `.env.example`.** The example file is committed.
3. **Never modify production or deployment env config** to work around a
   missing local file. Production env lives in Vercel/CI and is managed
   separately.
4. **Never hardcode keys into source.** If the app fails to load without an
   env var, that is the correct failure — fix the env setup, not the code.
5. The symlinks the script creates live inside the worktree, but every
   `.env.local` path is gitignored, so they will not appear in `git status`.

## When to add a new app to the script

If you add an app to the repo that needs a `.env.local`, edit the `APPS`
array at the top of `scripts/setup-local-env.sh` and add an entry of the
form `app-dir|private-file-name.env.local`. Then add an `.env.example` in
the app directory with placeholder values, and document the expected keys
there.
