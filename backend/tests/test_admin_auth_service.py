"""Unit tests for admin authentication token service."""
from __future__ import annotations

import time

import pytest

from app.services.admin_auth_service import create_admin_token, verify_admin_token


class TestCreateAdminToken:
    def test_returns_dot_separated_token(self):
        token = create_admin_token('admin')
        assert '.' in token
        parts = token.split('.')
        assert len(parts) == 2
        assert all(parts)

    def test_different_users_produce_different_tokens(self):
        t1 = create_admin_token('alice')
        t2 = create_admin_token('bob')
        assert t1 != t2


class TestVerifyAdminToken:
    def test_valid_token_roundtrip(self):
        token = create_admin_token('admin')
        payload = verify_admin_token(token)
        assert payload['username'] == 'admin'
        assert 'expires_at' in payload

    def test_tampered_signature_rejected(self):
        token = create_admin_token('admin')
        payload, _sig = token.rsplit('.', 1)
        tampered = f'{payload}.AAAA'
        with pytest.raises(ValueError, match='Invalid admin token'):
            verify_admin_token(tampered)

    def test_tampered_payload_rejected(self):
        token = create_admin_token('admin')
        _payload, sig = token.split('.', 1)
        tampered = f'AAAA.{sig}'
        with pytest.raises(ValueError, match='Invalid admin token'):
            verify_admin_token(tampered)

    def test_no_dot_rejected(self):
        with pytest.raises(ValueError, match='Invalid admin token'):
            verify_admin_token('nodot')

    def test_expired_token_raises_lookup_error(self):
        token = create_admin_token('admin', hours=0)
        time.sleep(0.05)
        with pytest.raises(LookupError, match='expired'):
            verify_admin_token(token)

    def test_empty_string_rejected(self):
        with pytest.raises(ValueError):
            verify_admin_token('')
