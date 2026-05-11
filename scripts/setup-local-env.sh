#!/usr/bin/env bash
# setup-local-env.sh — symlink private dev env files into the current worktree.
#
# Purpose:
#   Worktrees never include .env.local files (they are gitignored). Instead,
#   developers keep their private dev env files outside the repo, in:
#
#     ~/.arei/env/kazaverde-web.env.local
#     ~/.arei/env/arei-admin.env.local
#
#   This script symlinks those files into the current worktree's app
#   directories so dev servers can read them.
#
# Properties:
#   - Idempotent: safe to run repeatedly.
#   - Never prints secret values.
#   - Never overwrites a real .env.local file (only replaces existing symlinks).
#   - Works in any worktree of this repo.
#   - Does not modify .env.example or any committed file.

set -euo pipefail

# Resolve repo root (works in main checkout and in worktrees).
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "error: must be run inside a git checkout of the AREI repo." >&2
  exit 1
fi

PRIVATE_DIR="${HOME}/.arei/env"

# App → private file name mapping. Add new apps here as they appear.
APPS=(
  "kazaverde-web|kazaverde-web.env.local"
  "arei-admin|arei-admin.env.local"
)

print_header() {
  echo "AREI local env setup"
  echo "--------------------"
  echo "Worktree:    $REPO_ROOT"
  echo "Private dir: $PRIVATE_DIR"
  echo ""
}

# Print missing-file instructions. Never prints secret values, only the
# expected path and the .env.example to copy from (if present).
instructions_for_missing() {
  local app="$1"
  local private_file="$2"
  local example_path="${REPO_ROOT}/${app}/.env.example"

  echo "  Missing: ${PRIVATE_DIR}/${private_file}"
  echo "  Create it once on this machine. It is read by every worktree."
  echo ""
  echo "    mkdir -p ${PRIVATE_DIR}"
  if [[ -f "$example_path" ]]; then
    echo "    cp ${app}/.env.example ${PRIVATE_DIR}/${private_file}"
    echo "    # then edit ${PRIVATE_DIR}/${private_file} with real dev values"
  else
    echo "    # ${app} has no .env.example yet — ask the team for the keys"
    echo "    # this app expects and add them to:"
    echo "    #   ${PRIVATE_DIR}/${private_file}"
  fi
  echo ""
  echo "  Never commit this file. Never paste it into the repo."
  echo ""
}

link_for_app() {
  local app="$1"
  local private_file_name="$2"
  local app_dir="${REPO_ROOT}/${app}"
  local target="${PRIVATE_DIR}/${private_file_name}"
  local link_path="${app_dir}/.env.local"

  if [[ ! -d "$app_dir" ]]; then
    echo "[skip] ${app}: directory does not exist in this worktree"
    return 0
  fi

  if [[ ! -f "$target" ]]; then
    echo "[need] ${app}: private file not found"
    instructions_for_missing "$app" "$private_file_name"
    return 0
  fi

  if [[ -e "$link_path" && ! -L "$link_path" ]]; then
    echo "[keep] ${app}/.env.local: real file present (not a symlink) — leaving untouched"
    return 0
  fi

  # -s symlink, -f replace existing symlink, -n do not follow existing symlink-to-dir
  ln -sfn "$target" "$link_path"
  echo "[ok]   ${app}/.env.local → ~/.arei/env/${private_file_name}"
}

main() {
  print_header

  local need_any=0
  for entry in "${APPS[@]}"; do
    local app="${entry%%|*}"
    local file="${entry##*|}"
    if [[ ! -f "${PRIVATE_DIR}/${file}" && -d "${REPO_ROOT}/${app}" ]]; then
      need_any=1
    fi
  done

  if [[ ! -d "$PRIVATE_DIR" && "$need_any" -eq 1 ]]; then
    echo "Private env directory does not exist yet: ${PRIVATE_DIR}"
    echo "Create it once with: mkdir -p ${PRIVATE_DIR}"
    echo ""
  fi

  for entry in "${APPS[@]}"; do
    local app="${entry%%|*}"
    local file="${entry##*|}"
    link_for_app "$app" "$file"
  done

  echo ""
  echo "Done. Re-run this script after creating any missing files."
}

main "$@"
