"""Unit tests for Pydantic request/response models."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models import (
    AppConfigPayload,
    ChartDatum,
    ChartSeries,
    LoginRequest,
    PdfGenerationRequest,
    ReportContext,
    SelectedCard,
    SessionLinkCreateRequest,
    ThemeLabelsPayload,
)


# ---------------------------------------------------------------------------
# SelectedCard
# ---------------------------------------------------------------------------

class TestSelectedCard:
    def test_valid_card(self):
        card = SelectedCard(id=1, title='Courage')
        assert card.id == 1
        assert card.title == 'Courage'
        assert card.labels == []
        assert card.summary is None

    def test_title_is_stripped(self):
        card = SelectedCard(id=5, title='  Bravery  ')
        assert card.title == 'Bravery'

    def test_blank_title_rejected(self):
        with pytest.raises(ValidationError):
            SelectedCard(id=1, title='   ')

    def test_duplicate_labels_deduplicated(self):
        card = SelectedCard(id=1, title='Card', labels=['a', 'b', 'a'])
        assert card.labels == ['a', 'b']

    def test_empty_string_labels_removed(self):
        card = SelectedCard(id=1, title='Card', labels=['a', '  ', 'b'])
        assert card.labels == ['a', 'b']

    def test_id_boundaries(self):
        assert SelectedCard(id=1, title='Min').id == 1
        assert SelectedCard(id=999, title='Max').id == 999
        with pytest.raises(ValidationError):
            SelectedCard(id=0, title='Zero')
        with pytest.raises(ValidationError):
            SelectedCard(id=1000, title='Overflow')

    def test_summary_stripped_to_none(self):
        card = SelectedCard(id=1, title='Card', summary='   ')
        assert card.summary is None

    def test_extra_fields_rejected(self):
        with pytest.raises(ValidationError):
            SelectedCard(id=1, title='Card', unknown_field='x')


# ---------------------------------------------------------------------------
# ReportContext
# ---------------------------------------------------------------------------

class TestReportContext:
    def test_defaults(self):
        ctx = ReportContext()
        assert ctx.language == 'en'
        assert ctx.session_title is None

    def test_supported_languages(self):
        for lang in ('en', 'nl', 'ro'):
            ctx = ReportContext(language=lang)
            assert ctx.language == lang

    def test_unsupported_language_rejected(self):
        with pytest.raises(ValidationError):
            ReportContext(language='fr')

    def test_optional_fields_blank_to_none(self):
        ctx = ReportContext(session_title='  ', facilitator='  ', notes='  ')
        assert ctx.session_title is None
        assert ctx.facilitator is None
        assert ctx.notes is None


# ---------------------------------------------------------------------------
# PdfGenerationRequest
# ---------------------------------------------------------------------------

class TestPdfGenerationRequest:
    def test_minimal_valid(self):
        req = PdfGenerationRequest(selected_cards=[{'id': 1, 'title': 'Card'}])
        assert len(req.selected_cards) == 1

    def test_max_six_cards(self):
        cards = [{'id': i, 'title': f'Card {i}'} for i in range(1, 7)]
        req = PdfGenerationRequest(selected_cards=cards)
        assert len(req.selected_cards) == 6

    def test_more_than_six_rejected(self):
        cards = [{'id': i, 'title': f'Card {i}'} for i in range(1, 8)]
        with pytest.raises(ValidationError):
            PdfGenerationRequest(selected_cards=cards)

    def test_empty_cards_rejected(self):
        with pytest.raises(ValidationError):
            PdfGenerationRequest(selected_cards=[])

    def test_duplicate_card_ids_rejected(self):
        with pytest.raises(ValidationError):
            PdfGenerationRequest(selected_cards=[
                {'id': 1, 'title': 'A'},
                {'id': 1, 'title': 'B'},
            ])


# ---------------------------------------------------------------------------
# ChartDatum / ChartSeries
# ---------------------------------------------------------------------------

class TestChartModels:
    def test_valid_datum(self):
        datum = ChartDatum(label='Stress', value=4.5)
        assert datum.label == 'Stress'

    def test_blank_datum_label_rejected(self):
        with pytest.raises(ValidationError):
            ChartDatum(label='  ', value=1)

    def test_negative_value_rejected(self):
        with pytest.raises(ValidationError):
            ChartDatum(label='X', value=-1)

    def test_valid_series(self):
        series = ChartSeries(title='Results', data=[{'label': 'A', 'value': 1}])
        assert series.title == 'Results'

    def test_empty_data_rejected(self):
        with pytest.raises(ValidationError):
            ChartSeries(title='Results', data=[])


# ---------------------------------------------------------------------------
# SessionLinkCreateRequest
# ---------------------------------------------------------------------------

class TestSessionLinkCreateRequest:
    def test_valid(self):
        req = SessionLinkCreateRequest(session_name='Test Session', session_label_id=3)
        assert req.session_name == 'Test Session'
        assert req.session_label_id == 3

    def test_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            SessionLinkCreateRequest(session_name='   ', session_label_id=1)

    def test_label_id_boundaries(self):
        with pytest.raises(ValidationError):
            SessionLinkCreateRequest(session_name='X', session_label_id=0)
        with pytest.raises(ValidationError):
            SessionLinkCreateRequest(session_name='X', session_label_id=7)


# ---------------------------------------------------------------------------
# AppConfigPayload / ThemeLabelsPayload
# ---------------------------------------------------------------------------

class TestAppConfigPayload:
    def test_defaults(self):
        config = AppConfigPayload()
        assert config.select_cards_blocked is False
        assert len(config.theme_labels.en) == 6
        assert config.card_labels == {}

    def test_card_labels_normalized(self):
        config = AppConfigPayload(card_labels={'1': [3, 1, 3], '2': [7, 2]})
        assert config.card_labels['1'] == [1, 3]
        assert config.card_labels['2'] == [2]

    def test_empty_card_id_dropped(self):
        config = AppConfigPayload(card_labels={'': [1]})
        assert '' not in config.card_labels

    def test_theme_labels_truncated_at_50(self):
        long_label = 'A' * 100
        payload = ThemeLabelsPayload(en=[long_label] * 6, nl=['x'] * 6, ro=['x'] * 6)
        assert len(payload.en[0]) == 50


# ---------------------------------------------------------------------------
# LoginRequest
# ---------------------------------------------------------------------------

class TestLoginRequest:
    def test_valid(self):
        req = LoginRequest(username='admin', password='pass')
        assert req.username == 'admin'

    def test_blank_credentials_rejected(self):
        with pytest.raises(ValidationError):
            LoginRequest(username='  ', password='pass')
        with pytest.raises(ValidationError):
            LoginRequest(username='admin', password='  ')
