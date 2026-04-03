"""Unit tests for the session registry service."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.services.session_registry_service import (
    clear_active_sessions,
    get_active_session,
    list_active_sessions,
    register_active_session,
)


def _future_iso(hours: int = 1) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def _past_iso(hours: int = 1) -> str:
    return (datetime.now(UTC) - timedelta(hours=hours)).isoformat()


class TestRegisterAndGet:
    def test_register_then_get(self):
        expires = _future_iso()
        register_active_session('s-001', expires, 'Test', 1, 'http://example.com')
        session = get_active_session('s-001')
        assert session['session_key'] == 's-001'
        assert session['session_name'] == 'Test'
        assert session['session_label_id'] == 1

    def test_missing_session_raises(self):
        with pytest.raises(LookupError, match='not active'):
            get_active_session('nonexistent')

    def test_expired_session_pruned(self):
        register_active_session('s-old', _past_iso(), 'Old', 1, '')
        with pytest.raises(LookupError):
            get_active_session('s-old')

    def test_overwrite_existing_session(self):
        expires = _future_iso()
        register_active_session('s-001', expires, 'First', 1, '')
        register_active_session('s-001', expires, 'Updated', 2, '')
        session = get_active_session('s-001')
        assert session['session_name'] == 'Updated'
        assert session['session_label_id'] == 2

    def test_default_label_id_on_invalid(self):
        register_active_session('s-x', _future_iso(), 'X', 99, '')
        session = get_active_session('s-x')
        assert session['session_label_id'] == 1

    def test_empty_name_gets_default(self):
        register_active_session('s-no-name', _future_iso(), '', 1, '')
        session = get_active_session('s-no-name')
        assert session['session_name'] == 'Session'


class TestListAndClear:
    def test_list_empty(self):
        assert list_active_sessions() == []

    def test_list_returns_only_active(self):
        register_active_session('active', _future_iso(2), 'Active', 1, '')
        register_active_session('expired', _past_iso(), 'Expired', 1, '')
        sessions = list_active_sessions()
        keys = [s['session_key'] for s in sessions]
        assert 'active' in keys
        assert 'expired' not in keys

    def test_list_sorted_by_expiry(self):
        register_active_session('later', _future_iso(5), 'Later', 1, '')
        register_active_session('sooner', _future_iso(1), 'Sooner', 1, '')
        sessions = list_active_sessions()
        assert sessions[0]['session_key'] == 'sooner'
        assert sessions[1]['session_key'] == 'later'

    def test_clear_returns_count(self):
        register_active_session('a', _future_iso(), 'A', 1, '')
        register_active_session('b', _future_iso(), 'B', 1, '')
        cleared = clear_active_sessions()
        assert cleared == 2
        assert list_active_sessions() == []

    def test_clear_empty_returns_zero(self):
        assert clear_active_sessions() == 0
