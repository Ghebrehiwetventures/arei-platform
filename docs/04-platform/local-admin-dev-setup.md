# Local Admin Dev Setup

**App:** `arei-admin`
**Stack:** Vite + React + Tailwind CSS v4 + Supabase

---

## Correct working directory

Always run the admin from its own subdirectory:

```
cd /path/to/arei-platform-clean/arei-admin
```

Do not run from the repo root or from a Claude/Codex git worktree directory.

---

## Required env file

Vite is configured with `envDir: ".."` — it reads `.env` from the **parent** of `arei-admin`, not from inside `arei-admin` itself.

The env file must be at:

```
arei-platform-clean/.env
```

Required variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

These are already present in `arei-platform-clean/.env`. Do not move or rename this file.

---

## Install dependencies

From inside `arei-admin/`:

```bash
npm install
```

Only needs to be run once, or after a `package.json` change. Do not run `npm install` from the repo root — it will not install the admin's dependencies.

---

## Start the dev server

```bash
cd arei-platform-clean/arei-admin
npm run dev
```

Or directly:

```bash
npx vite
```

---

## Expected localhost URL

Default port is **3099**:

```
http://localhost:3099
```

If port 3099 is taken, Vite will increment automatically and print the actual URL in the terminal. Always read the terminal output to confirm the port.

Do not assume port 5173 — that is Vite's global default but this project overrides it.

---

## Common blank-page causes

**Wrong env file location.**
If `VITE_SUPABASE_URL` is not set, the Supabase client initializes with empty strings. The app mounts but the auth check fails silently and the screen stays blank.
Fix: confirm `.env` is in `arei-platform-clean/` (parent of `arei-admin`), not inside `arei-admin/`.

**Wrong working directory.**
Running `vite` from the repo root or another directory means `envDir: ".."` resolves to the wrong parent. The env file is not found.
Fix: always `cd arei-admin` first.

**Missing node_modules.**
If `node_modules` is absent or broken, Vite fails to start. The terminal will show a module-not-found error.
Fix: `npm install` from inside `arei-admin/`.

**Wrong port.**
Navigating to `localhost:5173` when the server is on `3099` shows a browser error, not a blank page — but worth checking.
Fix: read the terminal output after `npm run dev`.

**Auth check pending.**
On first load, the app shows "Checking access…" while Supabase verifies the session. This is not a blank page — it is expected. If it stays on "Checking access…" indefinitely, the Supabase URL or key is wrong.

---

## How to check browser console

In Chrome or Safari:

1. Open `http://localhost:3099`
2. Right-click → Inspect (or `Cmd + Option + I`)
3. Go to the **Console** tab
4. Look for red errors on page load

In Vite dev mode, uncaught React render errors also produce an **error overlay** on top of the page. If the overlay appears but is dismissed, the page will go blank. The overlay contains the exact error and stack trace.

---

## Worktree node_modules issue (Claude/Codex)

Git worktrees do not inherit `node_modules` from the main working tree. If Claude or Codex runs the admin from a worktree path, `node_modules` will be missing and Vite will fail.

**Symptom:** Vite errors on startup with `Cannot find package 'vite'` or similar.

**Root cause:** `envDir: ".."` resolves to the worktree parent, not `arei-platform-clean/`. Even if `node_modules` is symlinked in, the env file is not found.

**Correct fix:** Always run the admin from the main repo's `arei-admin/` directory, not from a worktree path. Worktrees are for code changes only — do not start dev servers from them.

```
# Correct
cd /Users/ghebrehiwet/arei-platform-clean/arei-admin
npm run dev

# Wrong — worktree path
cd /Users/ghebrehiwet/arei-platform-clean/.claude/worktrees/<name>/arei-admin
npm run dev
```

If a worktree-based change needs visual inspection before merge, use Vercel preview instead of local dev.

---

*Last updated: May 2026*
