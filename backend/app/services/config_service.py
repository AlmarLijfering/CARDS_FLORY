from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from app.services.storage_service import ensure_storage_dir


DEFAULT_THEME_LABELS = {
    'en': [f'Label {index + 1}' for index in range(6)],
    'nl': [f'Label {index + 1}' for index in range(6)],
    'ro': [f'Label {index + 1}' for index in range(6)],
}

DEFAULT_CONFIG = {
    'select_cards_blocked': False,
    'theme_labels': DEFAULT_THEME_LABELS,
    'card_labels': {},
}

_CONFIG_LOCK = Lock()


def _config_path() -> Path:
    return ensure_storage_dir() / 'app_configuration.json'


def _clone_theme_labels(theme_labels: dict[str, list[str]] | None = None) -> dict[str, list[str]]:
    source = theme_labels or DEFAULT_THEME_LABELS
    return {
        'en': list(source.get('en', DEFAULT_THEME_LABELS['en'])),
        'nl': list(source.get('nl', DEFAULT_THEME_LABELS['nl'])),
        'ro': list(source.get('ro', DEFAULT_THEME_LABELS['ro'])),
    }


def _normalize_theme_labels(raw_theme_labels: object) -> dict[str, list[str]]:
    normalized = _clone_theme_labels(DEFAULT_THEME_LABELS)
    if not isinstance(raw_theme_labels, dict):
        return normalized

    for language in ('en', 'nl', 'ro'):
        raw_labels = raw_theme_labels.get(language)
        if not isinstance(raw_labels, list):
            continue

        normalized[language] = [
            _normalize_single_label(raw_labels[index] if index < len(raw_labels) else None, language, index)
            for index in range(6)
        ]

    return normalized


def _normalize_single_label(raw_value: object, language: str, index: int) -> str:
    if isinstance(raw_value, str):
        normalized = raw_value.strip()
        if normalized:
            return normalized[:50]
    return DEFAULT_THEME_LABELS[language][index]


def _normalize_card_labels(raw_card_labels: object) -> dict[str, list[int]]:
    normalized: dict[str, list[int]] = {}
    if not isinstance(raw_card_labels, dict):
        return normalized

    for raw_card_id, raw_labels in raw_card_labels.items():
        if not isinstance(raw_labels, list):
            continue

        card_id = str(raw_card_id).strip()
        if not card_id:
            continue

        labels: list[int] = []
        seen: set[int] = set()
        for raw_label in raw_labels:
            try:
                parsed = int(raw_label)
            except (TypeError, ValueError):
                continue
            if parsed < 1 or parsed > 6 or parsed in seen:
                continue
            seen.add(parsed)
            labels.append(parsed)

        if labels:
            normalized[card_id] = sorted(labels)

    return normalized


def normalize_configuration(raw_config: object) -> dict[str, object]:
    if not isinstance(raw_config, dict):
        return {
            'select_cards_blocked': DEFAULT_CONFIG['select_cards_blocked'],
            'theme_labels': _clone_theme_labels(DEFAULT_THEME_LABELS),
            'card_labels': {},
        }

    return {
        'select_cards_blocked': bool(raw_config.get('select_cards_blocked')),
        'theme_labels': _normalize_theme_labels(raw_config.get('theme_labels')),
        'card_labels': _normalize_card_labels(raw_config.get('card_labels')),
    }


def _load_configuration() -> dict[str, object]:
    path = _config_path()
    if not path.exists():
        return normalize_configuration(DEFAULT_CONFIG)

    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return normalize_configuration(DEFAULT_CONFIG)

    return normalize_configuration(payload)


def _persist_configuration(config: dict[str, object]) -> None:
    _config_path().write_text(json.dumps(config, indent=2, sort_keys=True), encoding='utf-8')


def get_configuration() -> dict[str, object]:
    with _CONFIG_LOCK:
        config = _load_configuration()
        # Rewrite once so old or partial files are normalized on first read.
        _persist_configuration(config)
    return config


def save_configuration(raw_config: object) -> dict[str, object]:
    config = normalize_configuration(raw_config)
    with _CONFIG_LOCK:
        _persist_configuration(config)
    return config
