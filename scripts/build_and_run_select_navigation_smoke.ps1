Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Node = Join-Path $RepoRoot ".tools\node-v24.14.0-win-x64\node.exe"
$ViteCli = Join-Path $RepoRoot "frontend\node_modules\vite\bin\vite.js"
$Python = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $Node)) {
  throw "Portable Node executable not found at $Node"
}

if (-not (Test-Path $ViteCli)) {
  throw "Vite CLI not found at $ViteCli. Install frontend dependencies first."
}

if (-not (Test-Path $Python)) {
  throw "Backend virtual environment not found at $Python"
}

Push-Location (Join-Path $RepoRoot "frontend")
try {
  & $Node $ViteCli build --configLoader native
}
finally {
  Pop-Location
}

& $Python (Join-Path $PSScriptRoot "select_navigation_smoke.py")
