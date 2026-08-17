# Fig Mobile POS — Windows desktop app (Electron)

Electron shell around the existing Next.js frontend + Express/Prisma backend.
**Windows only.**

## What it does

- **Local mode (default):** the app starts its own backend + frontend on this
  computer and keeps all data in a local SQLite file. Fully offline.
- **Hosted mode:** the app just opens a hosted website URL. Switch at runtime
  from **Settings → Desktop app**.

On a **fresh install** the app creates an **empty database** and opens the
**onboarding** screen. You create your store details and administrator account
(choose your own username + 4-digit PIN) there, then sign in. No shop data is
shipped inside the installer and no account is auto-created.

## Runtime switching

- Default config lives in `runtime.json` (`{"mode":"local","hostedUrl":""}`).
- The app stores its active config in the OS user-data dir (`fig-runtime.json`)
  and reads that. The **Settings → Desktop app** tab writes it and restarts.
- Hosted mode opens the URL directly; local data stays on the computer.

## Building the Windows installer

The backend uses the native module `better-sqlite3`, which must be compiled for
**Windows + Electron's ABI**. That can't happen on macOS, so build on Windows.

### Option A — GitHub Actions (recommended)
Run the **Release** workflow (`.github/workflows/release.yml`). It bumps the
version, tags, builds the frontend + production bundles, rebuilds native
modules, packages, and creates a GitHub Release with
`Fig Mobile POS-Setup-<version>.exe` attached.

### Option B — build on a Windows PC
With Node 22 + git installed:

```bat
git clone <repo> && cd <repo>
cd backend   && npm ci && npx prisma generate && cd ..
cd frontend  && npm ci && npm run build && cd ..
cd desktop   && npm ci && npm run rebuild && npm run dist:win
```

**Or use the helper script** (`scripts/build-test.ps1`) — installs, builds, runs
the test suites, and can package everything in one command:

```powershell
.\scripts\build-test.ps1            # install + build + test
.\scripts\build-test.ps1 -Pack      # also create release\win-unpacked to test
.\scripts\build-test.ps1 -Dist      # also build the installer .exe (desktop\release\)
```

**Recommended release loop:** build + test locally (`build-test.ps1 -Pack`), run
`desktop\release\win-unpacked\Fig Mobile POS.exe` to verify, and only then
trigger the **Release** workflow on GitHub.

`npm run dist:win` produces:
- `desktop/release/Fig Mobile POS-Setup-<version>.exe` — the installer
- `desktop/release/win-unpacked/` — a runnable folder (no install)

## Releases (automatic)

Two ways to get a release, both upload `Fig Mobile POS-Setup-<version>.exe`:

1. **One-click release:** open **Actions → Release → Run workflow**. Enter a
   version (or leave empty to auto-bump the patch). The workflow bumps the
   version in all three `package.json` files, commits + tags it, builds the
   installer on Windows, and creates a GitHub Release with the `.exe` attached.
2. **Local script:** `./scripts/run-app.sh` builds/launches the app locally
   from the same `production/` bundles the release packages.

Local helpers:
- `./scripts/version.sh <version>` — bumps the version in `backend/`,
  `frontend/` and `desktop/` and prints the commit/tag commands.
- `./scripts/run-app.sh` — run locally: `--build` rebuilds bundles, `--dev`
  runs from source, `--app`/`--pack` run the packaged Windows build.

## Notes / gotchas

- The frontend is served by `next start`/`next dev` and proxies `/api` to the
  backend via the `rewrites` in `next.config.*`. `main.js` sets `BACKEND_URL`
  so `/api` reaches the local backend in local mode.
- The backend runs as a **child process** using Electron's bundled Node
  (`ELECTRON_RUN_AS_NODE=1`), so it never depends on a system Node install.
- First run creates a fresh database from the bundled `schema.sql`
  (`setup.cjs`) and shows the onboarding screen to create the store +
  administrator account.
- JWT secret is generated once and persisted in the user-data dir.