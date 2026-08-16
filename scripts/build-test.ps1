# build-test.ps1 — install, build, test, and optionally package the Windows app.
#
# Usage:
#   .\scripts\build-test.ps1                 # install + build + test
#   .\scripts\build-test.ps1 -Pack           # also create release\win-unpacked
#   .\scripts\build-test.ps1 -Dist           # also build the installer .exe (dist)
#   .\scripts\build-test.ps1 -SkipInstall    # reuse existing node_modules
#   .\scripts\build-test.ps1 -SkipTests      # skip the test suites (faster)
param(
  [switch]$Pack,
  [switch]$Dist,
  [switch]$SkipInstall,
  [switch]$SkipTests
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Step([string]$msg) {
  Write-Host ""
  Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function RunIn([string]$dir, [string]$cmd) {
  Push-Location (Join-Path $Root $dir)
  try {
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed in $dir: $cmd (exit $LASTEXITCODE)" }
  }
  finally { Pop-Location }
}

if (-not $SkipInstall) {
  Step "Installing backend dependencies"
  RunIn "backend" "npm ci"
  RunIn "backend" "npx prisma generate"

  Step "Installing frontend dependencies"
  RunIn "frontend" "npm ci"

  Step "Installing desktop dependencies"
  RunIn "desktop" "npm ci"
}

Step "Building frontend"
RunIn "frontend" "npm run build"

Step "Preparing production frontend bundle"
RunIn "frontend" "npm run build:production"

if (-not $SkipTests) {
  Step "Backend tests"
  RunIn "backend" "npm test"

  Step "Frontend typecheck"
  RunIn "frontend" "npx tsc --noEmit"

  Step "Frontend tests"
  RunIn "frontend" "npm test"
}

Step "Rebuilding native modules for Electron (better-sqlite3)"
RunIn "desktop" "npm run rebuild"

Step "Building production backend bundle (esbuild + native + schema)"
RunIn "backend" "npm run build:production"

if ($Pack) {
  Step "Packaging win-unpacked app"
  RunIn "desktop" "npm run pack"
  Write-Host "`nPackaged app ready: $Root\desktop\release\win-unpacked\Fig Mobile POS.exe" -ForegroundColor Green
}

if ($Dist) {
  Step "Building installer (.exe)"
  RunIn "desktop" "npm run dist:win"
  Write-Host ""
  Write-Host "Installer created:" -ForegroundColor Green
  Get-ChildItem "$Root\desktop\release\*.exe" | ForEach-Object {
    Write-Host "  $($_.FullName)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  Run the app in a window:  cd desktop; npm start"
Write-Host "  Test the packaged exe:    $Root\desktop\release\win-unpacked\Fig Mobile POS.exe"
