from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import UTC, datetime, timedelta


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


def _tinyurl_api_token() -> str:
    return os.environ.get('TINYURL_API_TOKEN', '').strip()


def _tinyurl_domain() -> str:
    return os.environ.get('TINYURL_DOMAIN', 'tinyurl.com').strip() or 'tinyurl.com'


def _shorten_with_tinyurl(long_url: str) -> str | None:
    api_token = _tinyurl_api_token()
    if not api_token:
        return None

    payload = json.dumps(
        {
            'url': long_url,
            'domain': _tinyurl_domain(),
        }
    ).encode('utf-8')
    request = urllib.request.Request(
        'https://api.tinyurl.com/create',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response_data = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None

    if not isinstance(response_data, dict):
        return None

    data = response_data.get('data')
    if isinstance(data, dict):
        candidate = data.get('tiny_url') or data.get('short_url')
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    candidate = response_data.get('tiny_url') or response_data.get('short_url')
    if isinstance(candidate, str) and candidate.strip():
        return candidate.strip()

    return None


def create_session_link(hours: int = DEFAULT_LINK_TTL_HOURS) -> dict[str, str | bool]:
    session_key = _generate_session_key()
    expires_at = _expiry_timestamp(hours)
    payload = {
        'session_key': session_key,
        'expires_at': expires_at.isoformat(),
    }
    payload_bytes = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    token = f'{_base64url_encode(payload_bytes)}.{_token_signature(payload_bytes)}'
    long_url = _invite_url(token)
    short_url = _shorten_with_tinyurl(long_url) or long_url

    return {
        'session_key': session_key,
        'expires_at': expires_at.isoformat(),
        'long_url': long_url,
        'short_url': short_url,
        'used_tinyurl': short_url != long_url,
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
    if not isinstance(session_key, str) or not session_key:
        raise ValueError('Invalid session link token.')
    if not isinstance(expires_at, str) or not expires_at:
        raise ValueError('Invalid session link token.')

    try:
        expiry = datetime.fromisoformat(expires_at)
    except ValueError as exc:
        raise ValueError('Invalid session link token.') from exc

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)

    if expiry < datetime.now(UTC):
        raise LookupError('This session link has expired.')

    return {
        'session_key': session_key,
        'expires_at': expiry.isoformat(),
    }
