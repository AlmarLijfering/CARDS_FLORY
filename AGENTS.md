# AGENTS.md

## Project basics
- This is a Python project for Windows development.
- Use the local virtual environment in `.venv`.
- Prefer PowerShell commands.
- The main application code is in `Select_Cards`.

## Setup
- Create virtual environment if missing: `python -m venv .venv`
- Preferred Python executable: `.\.venv\Scripts\python.exe`
- Activate venv on PowerShell if allowed: `.\.venv\Scripts\Activate.ps1`
- If activation is blocked, use the venv Python directly.
- Install dependencies with: `.\.venv\Scripts\python.exe -m pip install -r .\Select_Cards\requirements.txt`

## Rules
- Do not change dependency files unless required.
- Ask before adding new frameworks or major libraries.
- Keep edits minimal and focused.
- Preserve existing folder structure and naming.
- Do not move files unless clearly necessary.

## Validation
- Run tests before proposing completion.
- If no tests exist, run the main startup command and do a basic smoke check.
- Prefer validating the actual app entry point before suggesting completion.

## Common commands
- Run app: `.\.venv\Scripts\python.exe .\Select_Cards\server.py`
- Run tests: `.\.venv\Scripts\python.exe -m unittest discover -s tests -v`
- `pytest` and `ruff` are not part of the current checked-in environment; do not assume they are available unless they are installed explicitly.

## Notes
- Waitress binds to `0.0.0.0:8000`; open the app in the browser via `http://localhost:8000` or `http://127.0.0.1:8000`.
- Do not assume the root URL `/` is the correct application route without checking `server.py`.
