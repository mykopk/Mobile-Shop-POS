#!/usr/bin/env bash
# Fast Windows test build: pushes the current branch, triggers a Windows CI
# build (no release), and downloads the installer artifact. Use this to test
# changes on Windows without bumping the version or creating a release.
#
# Usage: ./scripts/build-win.sh [branch]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-$(git branch --show-current)}"
WF="Build Windows installer"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "You have uncommitted changes. Commit or stash them first (the CI builds from the repo)." >&2
  exit 1
fi

echo "Pushing $BRANCH..."
git push origin "$BRANCH"

echo "Triggering $WF on $BRANCH..."
RUN_ID=$(gh workflow run "$WF" --ref "$BRANCH" --json 2>/dev/null | jq -r .id || true)
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  RUN_ID=$(gh run list --workflow "$WF" --limit 1 --json databaseId --jq '.[0].databaseId')
fi
echo "Run: $RUN_ID"

echo "Waiting for build to finish..."
gh run watch "$RUN_ID" --exit-status

echo "Downloading build artifacts..."
rm -rf "$ROOT/.win-build"
mkdir -p "$ROOT/.win-build"
gh run download "$RUN_ID" -n fig-pos-setup -D "$ROOT/.win-build"

echo
echo "Artifacts ready:"
ls -lh "$ROOT/.win-build/"

echo
echo "Testing options:"
echo "  Installer : $ROOT/.win-build/*-Setup-*.exe  (double-click to install)"
echo "  No install: $ROOT/.win-build/*-no-install.zip  (extract, then run 'Fig Mobile POS.exe')"