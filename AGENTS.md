# AGENTS.md

## Project basics
- This repository is now a monorepo for the therapy cards application.
- The primary application structure is:
  - `backend/` for FastAPI and Python code
  - `frontend/` for React, Vite, and Tailwind CSS
- The legacy Flask app still exists in `Select_Cards/` as a reference source during migration work.
- Prefer PowerShell commands on Windows.

## Python setup
- The backend uses its own virtual environment in `backend/.venv`.
- Create it with: `.\.venv\Scripts\python.exe -m venv .\backend\.venv`
  - This bootstraps from the repo-level `.venv` when system Python is not on PATH.
- Preferred backend Python executable: `.\backend\.venv\Scripts\python.exe`
- Install backend dependencies with:
  - `.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt`

## Frontend setup
- The frontend lives in `frontend/`.
- Install dependencies from `frontend/package.json`.
- If `node` or `npm` are not on PATH, the workspace includes a portable Node toolchain under:
  - `.\.tools\node-v24.14.0-win-x64\`
- Example install command:
  - `.\.tools\node-v24.14.0-win-x64\npm.cmd install`

## Run commands
- Run backend locally:
  - `Set-Location .\backend`
  - `.\.venv\Scripts\python.exe .\main.py`
- Recommended backend dev server:
  - `Set-Location .\backend`
  - `.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8001`
- Run frontend locally:
  - `Set-Location .\frontend`
  - `..\.tools\node-v24.14.0-win-x64\node.exe .\node_modules\vite\bin\vite.js --configLoader native`
- Build frontend:
  - `Set-Location .\frontend`
  - `..\.tools\node-v24.14.0-win-x64\node.exe .\node_modules\vite\bin\vite.js build --configLoader native`

## Environment
- Frontend API base URL:
  - `frontend/.env.example` contains `VITE_API_URL=http://localhost:8001`
- Backend CORS origins:
  - configure with `FRONTEND_ORIGINS`
  - optional `FRONTEND_URL` can be added for Render deployments

## Rules
- Keep patient/session selections out of backend persistence and databases.
- Backend should only accept the final payload, generate the PDF in memory, and return it.
- Frontend owns active session state.
- Preserve the monorepo root structure with `backend/` and `frontend/`.
- Do not move or delete the legacy `Select_Cards/` app unless explicitly requested.

## Validation
- Prefer validating both sides of the stack:
  - backend import or PDF smoke check
  - frontend production build
- Current frontend build command uses Vite with `--configLoader native` because it behaves more reliably in this Windows/OneDrive workspace.
