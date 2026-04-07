from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

import jwt


DEFAULT_ADMIN_TOKEN_TTL_HOURS = 12
_JWT_ALGORITHM = 'HS256'


def _admin_auth_secret() -> str:
    raw_secret = os.environ.get('ADMIN_AUTH_SECRET', '').strip()
    if not raw_secret:
        raw_secret = os.environ.get('SESSION_LINK_SECRET', '').strip()
    if not raw_secret:
        raw_secret = 'therapy-cards-dev-admin-auth-secret'
    return raw_secret


def create_admin_token(username: str, hours: int = DEFAULT_ADMIN_TOKEN_TTL_HOURS) -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=hours)
    payload = {'sub': username, 'exp': expires_at}
    return jwt.encode(payload, _admin_auth_secret(), algorithm=_JWT_ALGORITHM)


def verify_admin_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(token, _admin_auth_secret(), algorithms=[_JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise LookupError('Admin session has expired. Please log in again.') from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError('Invalid admin token.') from exc

    username = payload.get('sub')
    exp = payload.get('exp')
    if not isinstance(username, str) or not username.strip() or not isinstance(exp, int):
        raise ValueError('Invalid admin token.')

    return {
        'username': username.strip(),
        'expires_at': datetime.fromtimestamp(exp, tz=UTC).isoformat(),
    }
