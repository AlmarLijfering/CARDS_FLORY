from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock


ROOT_DIR = Path(__file__).resolve().parents[3]
_REGISTRY_LOCK = Lock()


def _storage_dir() -> Path:
    configured = os.environ.get('SESSION_LINK_STORAGE_DIR', '').strip()
    if configured:
        return Path(configured)
    return ROOT_DIR / 'backend' / 'session_data'


def _registry_path() -> Path:
    return _storage_dir() / 'active_sessions.json'


def _ensure_storage() -> None:
    _registry_path().parent.mkdir(parents=True, exist_ok=True)


def _parse_expiry(raw_value: str) -> datetime:
    expiry = datetime.fromisoformat(raw_value)
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)
    return expiry


def _load_registry() -> dict[str, str]:
    _ensure_storage()
    path = _registry_path()
    if not path.exists():
        return {}

    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}

    if not isinstance(payload, dict):
        return {}

    normalized: dict[str, str] = {}
    for session_key, expires_at in payload.items():
        if isinstance(session_key, str) and isinstance(expires_at, str):
            normalized[session_key] = expires_at
    return normalized


def _persist_registry(registry: dict[str, str]) -> None:
    _ensure_storage()
    _registry_path().write_text(json.dumps(registry, indent=2, sort_keys=True), encoding='utf-8')


def _cleanup_registry(registry: dict[str, str]) -> dict[str, str]:
    now = datetime.now(UTC)
    active_only: dict[str, str] = {}
    for session_key, expires_at in registry.items():
        try:
            expiry = _parse_expiry(expires_at)
        except ValueError:
            continue
        if expiry >= now:
            active_only[session_key] = expiry.isoformat()
    return active_only


def register_active_session(session_key: str, expires_at: str) -> None:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        registry[session_key] = _parse_expiry(expires_at).isoformat()
        _persist_registry(registry)


def get_active_session(session_key: str) -> dict[str, str]:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        _persist_registry(registry)

    expires_at = registry.get(session_key)
    if not expires_at:
        raise LookupError('This session is not active.')

    return {
        'session_key': session_key,
        'expires_at': expires_at,
    }


def clear_active_sessions() -> int:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        cleared_count = len(registry)
        _persist_registry({})
    return cleared_count
