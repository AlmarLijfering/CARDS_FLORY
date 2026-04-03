"""Unit tests for the session link service."""
from __future__ import annotations

import pytest

from app.services.config_service import save_configuration, DEFAULT_THEME_LABELS
from app.services.session_link_service import create_session_link, verify_session_link


def _setup_label_in_config(label_id: int = 1) -> None:
    """Ensure at least one card has the given label so the label is 'available'."""
    save_configuration({
        'select_cards_blocked': False,
        'theme_labels': DEFAULT_THEME_LABELS,
        'card_labels': {'1': [label_id]},
    })


class TestCreateSessionLink:
    def test_returns_required_fields(self):
        _setup_label_in_config(1)
        result = create_session_link('My Session', 1)
        assert 'session_key' in result
        assert result['session_key'].startswith('session-')
        assert 'expires_at' in result
        assert 'session_name' in result
        assert 'session_url' in result
        assert result['session_name'] == 'My Session'

    def test_session_name_trimmed(self):
        _setup_label_in_config(1)
        result = create_session_link('  Padded Name  ', 1)
        assert result['session_name'] == 'Padded Name'

    def test_unavailable_label_raises(self):
        save_configuration({'card_labels': {}})
        with pytest.raises(ValueError, match='not available'):
            create_session_link('Session', 1)

    def test_session_url_contains_invite(self):
        _setup_label_in_config(2)
        result = create_session_link('Test', 2)
        assert '/#/invite/' in result['session_url']


class TestVerifySessionLink:
    def test_roundtrip_create_verify(self):
        _setup_label_in_config(1)
        created = create_session_link('Roundtrip', 1)
        token = created['session_url'].split('/#/invite/')[-1]
        verified = verify_session_link(token)
        assert verified['session_key'] == created['session_key']
        assert verified['session_name'] == 'Roundtrip'

    def test_invalid_token_raises_value_error(self):
        with pytest.raises(ValueError):
            verify_session_link('totally.bogus')

    def test_no_dot_raises_value_error(self):
        with pytest.raises(ValueError):
            verify_session_link('nodot')

    def test_tampered_signature_rejected(self):
        _setup_label_in_config(1)
        created = create_session_link('Tamper', 1)
        token = created['session_url'].split('/#/invite/')[-1]
        payload, _sig = token.rsplit('.', 1)
        with pytest.raises(ValueError):
            verify_session_link(f'{payload}.AAAA')
