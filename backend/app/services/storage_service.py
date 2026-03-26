from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]


def storage_dir() -> Path:
    configured = os.environ.get('APP_STORAGE_DIR', '').strip()
    if configured:
        return Path(configured)

    configured = os.environ.get('SESSION_LINK_STORAGE_DIR', '').strip()
    if configured:
        return Path(configured)

    return ROOT_DIR / 'backend' / 'session_data'


def ensure_storage_dir() -> Path:
    target = storage_dir()
    target.mkdir(parents=True, exist_ok=True)
    return target
