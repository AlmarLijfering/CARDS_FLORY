from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from app.services.storage_service import ensure_storage_dir

_REGISTRY_LOCK = Lock()


def _storage_dir() -> Path:
    return ensure_storage_dir()


def _registry_path() -> Path:
    return _storage_dir() / 'active_sessions.json'


def _ensure_storage() -> None:
    _registry_path().parent.mkdir(parents=True, exist_ok=True)


def _parse_expiry(raw_value: str) -> datetime:
    expiry = datetime.fromisoformat(raw_value)
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)
    return expiry


def _load_registry() -> dict[str, dict[str, str]]:
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

    normalized: dict[str, dict[str, str]] = {}
    for session_key, session_entry in payload.items():
        if not isinstance(session_key, str):
            continue
        if isinstance(session_entry, str):
            normalized[session_key] = {
                'expires_at': session_entry,
                'session_url': '',
            }
            continue
        if isinstance(session_entry, dict):
            expires_at = session_entry.get('expires_at')
            session_url = session_entry.get('session_url', '')
            if isinstance(expires_at, str) and isinstance(session_url, str):
                normalized[session_key] = {
                    'expires_at': expires_at,
                    'session_url': session_url,
                }
    return normalized


def _persist_registry(registry: dict[str, dict[str, str]]) -> None:
    _ensure_storage()
    _registry_path().write_text(json.dumps(registry, indent=2, sort_keys=True), encoding='utf-8')


def _cleanup_registry(registry: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    now = datetime.now(UTC)
    active_only: dict[str, dict[str, str]] = {}
    for session_key, session_entry in registry.items():
        expires_at = session_entry.get('expires_at')
        try:
            expiry = _parse_expiry(expires_at)
        except (TypeError, ValueError):
            continue
        if expiry >= now:
            active_only[session_key] = {
                'expires_at': expiry.isoformat(),
                'session_url': session_entry.get('session_url', ''),
            }
    return active_only


def register_active_session(session_key: str, expires_at: str, session_url: str) -> None:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        registry[session_key] = {
            'expires_at': _parse_expiry(expires_at).isoformat(),
            'session_url': session_url,
        }
        _persist_registry(registry)


def get_active_session(session_key: str) -> dict[str, str | None]:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        _persist_registry(registry)

    session_entry = registry.get(session_key)
    if not session_entry:
        raise LookupError('This session is not active.')

    return {
        'session_key': session_key,
        'expires_at': session_entry['expires_at'],
        'session_url': session_entry.get('session_url') or None,
    }


def list_active_sessions() -> list[dict[str, str | None]]:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        _persist_registry(registry)

    sessions = [
        {
            'session_key': session_key,
            'expires_at': session_entry['expires_at'],
            'session_url': session_entry.get('session_url') or None,
        }
        for session_key, session_entry in registry.items()
    ]
    sessions.sort(key=lambda session: session['expires_at'])
    return sessions


def clear_active_sessions() -> int:
    with _REGISTRY_LOCK:
        registry = _cleanup_registry(_load_registry())
        cleared_count = len(registry)
        _persist_registry({})
    return cleared_count
