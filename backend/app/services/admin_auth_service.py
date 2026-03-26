from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import UTC, datetime, timedelta


DEFAULT_ADMIN_TOKEN_TTL_HOURS = 12


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode('ascii')


def _base64url_decode(value: str) -> bytes:
    padding = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(f'{value}{padding}'.encode('ascii'))


def _admin_auth_secret() -> bytes:
    raw_secret = os.environ.get('ADMIN_AUTH_SECRET', '').strip()
    if not raw_secret:
        raw_secret = os.environ.get('SESSION_LINK_SECRET', '').strip()
    if not raw_secret:
        raw_secret = 'therapy-cards-dev-admin-auth-secret'
    return raw_secret.encode('utf-8')


def _token_signature(payload_bytes: bytes) -> str:
    signature = hmac.new(_admin_auth_secret(), payload_bytes, hashlib.sha256).digest()
    return _base64url_encode(signature)


def create_admin_token(username: str, hours: int = DEFAULT_ADMIN_TOKEN_TTL_HOURS) -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=hours)
    payload = {
        'username': username,
        'expires_at': expires_at.isoformat(),
    }
    payload_bytes = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    return f'{_base64url_encode(payload_bytes)}.{_token_signature(payload_bytes)}'


def verify_admin_token(token: str) -> dict[str, str]:
    try:
        encoded_payload, encoded_signature = token.split('.', 1)
    except ValueError as exc:
        raise ValueError('Invalid admin token.') from exc

    payload_bytes = _base64url_decode(encoded_payload)
    expected_signature = _token_signature(payload_bytes)
    if not hmac.compare_digest(encoded_signature, expected_signature):
        raise ValueError('Invalid admin token.')

    try:
        payload = json.loads(payload_bytes.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid admin token.') from exc

    username = payload.get('username')
    expires_at = payload.get('expires_at')
    if not isinstance(username, str) or not username.strip():
        raise ValueError('Invalid admin token.')
    if not isinstance(expires_at, str) or not expires_at:
        raise ValueError('Invalid admin token.')

    try:
        expiry = datetime.fromisoformat(expires_at)
    except ValueError as exc:
        raise ValueError('Invalid admin token.') from exc

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)

    if expiry < datetime.now(UTC):
        raise LookupError('Admin session has expired. Please log in again.')

    return {
        'username': username.strip(),
        'expires_at': expiry.isoformat(),
    }
