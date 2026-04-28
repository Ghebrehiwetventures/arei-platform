#!/usr/bin/env bash
# Deploy arei-landing to Vercel.
#
# Usage:
#   bash scripts/deploy.sh preview   → preview deploy from current branch
#   bash scripts/deploy.sh prod      → production deploy (requires HEAD on main)
#
# Run from arei-landing/ (or via npm run deploy:preview / deploy:prod).
# This script never touches files outside arei-landing/.

set -euo pipefail

mode="${1:-}"
case "$mode" in
  preview|prod) ;;
  *) echo "usage: $0 preview|prod" >&2; exit 2 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANDING_DIR="$(dirname "$SCRIPT_DIR")"
cd "$LANDING_DIR"

# 1. One-time link to Vercel project (creates arei-landing/.vercel/project.json).
if [ ! -f .vercel/project.json ]; then
  echo "→ Linking arei-landing/ to Vercel project (one-time per checkout)…"
  npx -y vercel@latest link --yes --project arei-landing
fi

# 2. Refuse to deploy if arei-landing/ has uncommitted changes — prevents drift
#    between what's on disk and what's in git history.
if [ -n "$(git status --porcelain -- .)" ]; then
  echo "✘ arei-landing/ has uncommitted changes. Commit or stash before deploying:" >&2
  git status --short -- . >&2
  exit 1
fi

# 3. Prod must come from main. Preview can come from any branch.
branch="$(git rev-parse --abbrev-ref HEAD)"
sha="$(git rev-parse --short HEAD)"

if [ "$mode" = "prod" ]; then
  if [ "$branch" != "main" ]; then
    echo "✘ Prod deploy requires HEAD on 'main'. You are on '$branch'." >&2
    echo "  Use a deploy worktree: git worktree add ~/arei-deploy main" >&2
    echo "  Then: cd ~/arei-deploy/arei-landing && npm run deploy:prod" >&2
    exit 1
  fi
  echo "→ Production deploy from main @ ${sha}…"
  npx -y vercel@latest --prod --yes
else
  echo "→ Preview deploy from ${branch} @ ${sha}…"
  npx -y vercel@latest --yes
fi
