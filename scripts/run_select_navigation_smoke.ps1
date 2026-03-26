Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
  throw "Backend virtual environment not found at $Python"
}

& $Python (Join-Path $PSScriptRoot "select_navigation_smoke.py")
