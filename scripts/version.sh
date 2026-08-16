#!/usr/bin/env bash
# Bump the app version across backend/, frontend/ and desktop/, then tag it.
# Usage: ./scripts/version.sh 0.2.0
set -euo pipefail

VERSION="${1:?Usage: ./scripts/version.sh 0.2.0}"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be semver, e.g. 0.2.0" >&2
  exit 1
fi

for f in backend/package.json frontend/package.json desktop/package.json; do
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('$f', 'utf8'));
    p.version = '$VERSION';
    fs.writeFileSync('$f', JSON.stringify(p, null, 2) + '\n');
  "
  echo "Set version $VERSION in $f"
done

echo
echo "Now commit + tag + push (the workflow will build the installer and create a GitHub Release):"
echo "  git add -A"
echo "  git commit -m \"v$VERSION\""
echo "  git tag v$VERSION"
echo "  git push origin main --tags"