#!/usr/bin/env bash
# Generate CHANGELOG.md from git tags + commit history, and (optionally) a
# release-notes file for a specific version being released.
#
# Usage:
#   ./scripts/changelog.sh            # regenerate current state ("Unreleased")
#   ./scripts/changelog.sh 0.1.2      # add a section for the version being released
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGELOG="$ROOT/CHANGELOG.md"
NEW_VERSION="${1:-}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository" >&2
  exit 1
fi

if [ -n "$NEW_VERSION" ] && ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be semver, e.g. 0.1.2" >&2
  exit 1
fi

# Tags sorted newest-first by semver.
TAGS=()
while IFS= read -r t; do
  TAGS+=("$t")
done < <(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' || true)

commits_for() {
  git log --format='%s' "$1" \
    | grep -vE '^v[0-9]+\.[0-9]+\.[0-9]+' \
    | grep -v '^Merge branch' \
    | grep -v '^Merge pull request' \
    || true
}

render_entries() {
  local range="$1" lines
  lines="$(commits_for "$range")"
  if [ -n "$lines" ]; then
    printf '%s\n' "$lines" | sed 's/^/- /'
  else
    echo "- No notable changes."
  fi
}

HEADER="# Changelog

All notable changes are documented here. This file is auto-generated on every
release by \`scripts/changelog.sh\` (run from the CI release workflow) — do not
edit by hand.

"

{
  printf '%s' "$HEADER"

  if [ -n "$NEW_VERSION" ]; then
    base="${TAGS[0]:-}"
    range="${base:+"$base..HEAD"}"
    [ -z "$range" ] && range="HEAD"
    echo "## v$NEW_VERSION"
    echo
    echo "- Released on: $(date +%Y-%m-%d)"
    echo
    render_entries "$range"
    echo
  fi

  for i in "${!TAGS[@]}"; do
    t="${TAGS[$i]}"
    [ "$t" = "v$NEW_VERSION" ] && continue
    next="${TAGS[$((i + 1))]:-}"
    range="$t"
    [ -n "$next" ] && range="$next..$t"
    echo "## $t"
    echo
    render_entries "$range"
    echo
  done
} > "$CHANGELOG"

echo "Wrote $CHANGELOG"

if [ -n "$NEW_VERSION" ]; then
  awk -v v="## v$NEW_VERSION" 'index($0, v)==1{p=1;next} /^## v[0-9]/{if(p)exit} p' "$CHANGELOG" > "$ROOT/.release-notes.md"
  echo "Wrote $ROOT/.release-notes.md"
fi