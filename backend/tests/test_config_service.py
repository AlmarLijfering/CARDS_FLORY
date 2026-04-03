"""Unit tests for the configuration service."""
from __future__ import annotations

import json

from app.services.config_service import (
    DEFAULT_CONFIG,
    DEFAULT_THEME_LABELS,
    get_configuration,
    normalize_configuration,
    save_configuration,
)


class TestNormalizeConfiguration:
    def test_none_returns_defaults(self):
        config = normalize_configuration(None)
        assert config['select_cards_blocked'] is False
        assert config['theme_labels']['en'] == DEFAULT_THEME_LABELS['en']
        assert config['card_labels'] == {}

    def test_non_dict_returns_defaults(self):
        config = normalize_configuration('bad')
        assert config['select_cards_blocked'] is False

    def test_preserves_valid_theme_labels(self):
        raw = {
            'select_cards_blocked': False,
            'theme_labels': {
                'en': ['A', 'B', 'C', 'D', 'E', 'F'],
                'nl': ['G', 'H', 'I', 'J', 'K', 'L'],
                'ro': ['M', 'N', 'O', 'P', 'Q', 'R'],
            },
            'card_labels': {},
        }
        config = normalize_configuration(raw)
        assert config['theme_labels']['en'] == ['A', 'B', 'C', 'D', 'E', 'F']

    def test_missing_language_gets_defaults(self):
        raw = {
            'theme_labels': {
                'en': ['A', 'B', 'C', 'D', 'E', 'F'],
            },
        }
        config = normalize_configuration(raw)
        assert config['theme_labels']['nl'] == DEFAULT_THEME_LABELS['nl']

    def test_short_label_list_padded_with_defaults(self):
        raw = {
            'theme_labels': {'en': ['Only', 'Two'], 'nl': [], 'ro': []},
        }
        config = normalize_configuration(raw)
        assert config['theme_labels']['en'][0] == 'Only'
        assert config['theme_labels']['en'][1] == 'Two'
        assert config['theme_labels']['en'][2] == DEFAULT_THEME_LABELS['en'][2]

    def test_label_truncated_at_50_chars(self):
        raw = {
            'theme_labels': {'en': ['x' * 100] + ['a'] * 5, 'nl': ['a'] * 6, 'ro': ['a'] * 6},
        }
        config = normalize_configuration(raw)
        assert len(config['theme_labels']['en'][0]) == 50

    def test_card_labels_normalized(self):
        raw = {'card_labels': {'5': [3, 1, 3, 7], '': [1]}}
        config = normalize_configuration(raw)
        assert config['card_labels']['5'] == [1, 3]
        assert '' not in config['card_labels']

    def test_card_labels_non_int_skipped(self):
        raw = {'card_labels': {'1': ['abc', 2, None]}}
        config = normalize_configuration(raw)
        assert config['card_labels']['1'] == [2]

    def test_select_cards_blocked_truthy(self):
        config = normalize_configuration({'select_cards_blocked': 1})
        assert config['select_cards_blocked'] is True


class TestGetAndSaveConfiguration:
    def test_get_returns_defaults_on_empty_dir(self):
        config = get_configuration()
        assert config['select_cards_blocked'] is False
        assert len(config['theme_labels']['en']) == 6

    def test_save_then_get_roundtrip(self):
        payload = {
            'select_cards_blocked': True,
            'theme_labels': {
                'en': ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'],
                'nl': DEFAULT_THEME_LABELS['nl'],
                'ro': DEFAULT_THEME_LABELS['ro'],
            },
            'card_labels': {'10': [2, 4]},
        }
        saved = save_configuration(payload)
        assert saved['select_cards_blocked'] is True
        assert saved['theme_labels']['en'][0] == 'Alpha'
        assert saved['card_labels']['10'] == [2, 4]

        reloaded = get_configuration()
        assert reloaded == saved

    def test_save_normalizes_invalid_data(self):
        saved = save_configuration({'card_labels': {'1': [99]}})
        assert saved['card_labels'] == {}
