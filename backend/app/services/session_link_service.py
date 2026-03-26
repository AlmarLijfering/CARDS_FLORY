from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta

from app.services.config_service import get_configuration
from app.services.session_registry_service import get_active_session, register_active_session


DEFAULT_LINK_TTL_HOURS = 24


def _session_link_secret() -> bytes:
    raw_secret = os.environ.get('SESSION_LINK_SECRET', '').strip()
    if not raw_secret:
        raw_secret = 'therapy-cards-dev-session-link-secret'
    return raw_secret.encode('utf-8')


def _frontend_app_url() -> str:
    configured = os.environ.get('FRONTEND_APP_URL', '').strip()
    if configured:
        return configured.rstrip('/')

    fallback = os.environ.get('FRONTEND_URL', '').strip()
    if fallback:
        return fallback.rstrip('/')

    return 'http://localhost:5173'


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode('ascii')


def _base64url_decode(value: str) -> bytes:
    padding = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(f'{value}{padding}'.encode('ascii'))


def _token_signature(payload_bytes: bytes) -> str:
    signature = hmac.new(_session_link_secret(), payload_bytes, hashlib.sha256).digest()
    return _base64url_encode(signature)


def _generate_session_key() -> str:
    return f'session-{secrets.token_hex(4)}'


def _expiry_timestamp(hours: int = DEFAULT_LINK_TTL_HOURS) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


def _invite_url(token: str) -> str:
    return f'{_frontend_app_url()}/#/invite/{token}'


def _normalize_session_name(session_name: str) -> str:
    normalized = session_name.strip()
    return normalized[:120]


def _available_session_labels() -> set[int]:
    config = get_configuration()
    raw_card_labels = config.get('card_labels', {})
    available_labels: set[int] = set()
    if not isinstance(raw_card_labels, dict):
        return available_labels

    for raw_labels in raw_card_labels.values():
        if not isinstance(raw_labels, list):
            continue
        for raw_label_id in raw_labels:
            try:
                parsed = int(raw_label_id)
            except (TypeError, ValueError):
                continue
            if 1 <= parsed <= 6:
                available_labels.add(parsed)
    return available_labels


def _normalize_session_label_id(session_label_id: int) -> int:
    try:
        normalized = int(session_label_id)
    except (TypeError, ValueError) as exc:
        raise ValueError('This label is not available.') from exc

    if normalized not in _available_session_labels():
        raise ValueError('This label is not available.')
    return normalized


def create_session_link(session_name: str, session_label_id: int, hours: int = DEFAULT_LINK_TTL_HOURS) -> dict[str, str | bool | int]:
    session_key = _generate_session_key()
    expires_at = _expiry_timestamp(hours)
    normalized_session_name = _normalize_session_name(session_name)
    normalized_session_label_id = _normalize_session_label_id(session_label_id)
    payload = {
        'session_key': session_key,
        'expires_at': expires_at.isoformat(),
        'session_name': normalized_session_name,
        'session_label_id': normalized_session_label_id,
    }
    payload_bytes = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    token = f'{_base64url_encode(payload_bytes)}.{_token_signature(payload_bytes)}'
    session_url = _invite_url(token)
    register_active_session(session_key, expires_at.isoformat(), normalized_session_name, normalized_session_label_id, session_url)

    return {
        'session_key': session_key,
        'expires_at': expires_at.isoformat(),
        'session_name': normalized_session_name,
        'session_label_id': normalized_session_label_id,
        'session_url': session_url,
    }


def verify_session_link(token: str) -> dict[str, str]:
    try:
        encoded_payload, encoded_signature = token.split('.', 1)
    except ValueError as exc:
        raise ValueError('Invalid session link token.') from exc

    payload_bytes = _base64url_decode(encoded_payload)
    expected_signature = _token_signature(payload_bytes)
    if not hmac.compare_digest(encoded_signature, expected_signature):
        raise ValueError('Invalid session link token.')

    try:
        payload = json.loads(payload_bytes.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid session link token.') from exc

    session_key = payload.get('session_key')
    expires_at = payload.get('expires_at')
    session_name = payload.get('session_name')
    session_label_id = payload.get('session_label_id')
    if not isinstance(session_key, str) or not session_key:
        raise ValueError('Invalid session link token.')
    if not isinstance(expires_at, str) or not expires_at:
        raise ValueError('Invalid session link token.')
    if not isinstance(session_name, str) or not session_name.strip():
        raise ValueError('Invalid session link token.')
    if not isinstance(session_label_id, int) or session_label_id < 1 or session_label_id > 6:
        raise ValueError('Invalid session link token.')

    try:
        expiry = datetime.fromisoformat(expires_at)
    except ValueError as exc:
        raise ValueError('Invalid session link token.') from exc

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)

    if expiry < datetime.now(UTC):
        raise LookupError('This session link has expired.')

    active_session = get_active_session(session_key)

    return {
        'session_key': active_session['session_key'],
        'expires_at': active_session['expires_at'],
        'session_name': active_session['session_name'],
        'session_label_id': active_session['session_label_id'],
    }
