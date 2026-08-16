# Changelog

All notable changes are documented here. This file is auto-generated on every
release by `scripts/changelog.sh` (run from the CI release workflow) — do not
edit by hand.

## v0.1.5

- Released on: 2026-08-16

- feat: inject crash-report token at build time from GitHub secret

## v0.1.4

- feat: send crash reports to GitHub Issues

## v0.1.3

- fix: package logging.js + loading.html in the app
- feat: loading screen during desktop startup

## v0.1.2

- feat: auto changelog + crash logging for desktop app

## v0.1.1

- No notable changes.

## v0.1.0

- remove unused backend build config
- self-contained backend bundle (esbuild) + standalone frontend; slim installer
- add -Dist option to build installer locally
- add Windows build-test helper script
- drop win-unpacked artifact upload to speed up builds
- add Windows app icon
- reverted
- changed e
- fix: grant contents:write to create GitHub release
- fix: use windows-2022 runner for native module build
- Money ledger, Windows desktop app, tests, CI & auto-releases
- docs: refresh feature audit and roadmap; fix test DB reset order
- feat: thermal printing + per-document print defaults
- feat: offline POS queue
- feat: purchase orders
- feat: backup/restore UI
- feat: Z-report + cash session reconciliation
- fix: money rounding, credit-limit-0, expense tz, return void, idempotency, tests
- feat: production hardening + POS/reservations/dashboard overhaul
- feat: add Render deployment config; fix migrations and seed for fresh deploys
- feat: complete POS system overhaul - print studio, reports hub, settings, auth upgrades
- fix: resolve merge conflicts in user endpoints and settings page
- feat: expand backend core libs, endpoints, frontend pages, UI components, and docs
- feat: phase1 backend endpoints, frontend pages, UI components, and schema updates
- Initial commit: DOST Mobile POS project scaffold

