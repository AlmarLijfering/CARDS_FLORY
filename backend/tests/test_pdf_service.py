"""Unit tests for PDF generation service."""
from __future__ import annotations

from app.models import PdfGenerationRequest, ReportContext, SelectedCard
from app.services.pdf_service import _truncate_notes, build_pdf


class TestTruncateNotes:
    def test_none_returns_placeholder(self):
        assert _truncate_notes(None) == 'No notes added.'

    def test_empty_string_returns_placeholder(self):
        assert _truncate_notes('') == 'No notes added.'

    def test_whitespace_only_returns_placeholder(self):
        assert _truncate_notes('   \n  \n  ') == 'No notes added.'

    def test_short_text_preserved(self):
        assert _truncate_notes('Hello world') == 'Hello world'

    def test_lines_capped_at_six(self):
        text = '\n'.join(f'Line {i}' for i in range(1, 10))
        result = _truncate_notes(text)
        assert result.endswith('...')
        assert result.count('\n') <= 5

    def test_chars_capped_at_500(self):
        long_line = 'A' * 600
        result = _truncate_notes(long_line)
        assert len(result) <= 503  # 500 + '...'

    def test_crlf_handled(self):
        text = 'Line 1\r\nLine 2\r\nLine 3'
        result = _truncate_notes(text)
        assert 'Line 1' in result
        assert 'Line 3' in result


class TestBuildPdf:
    def _make_request(self, num_cards=1, notes=None, language='en'):
        cards = [SelectedCard(id=i, title=f'Card {i:03d}') for i in range(1, num_cards + 1)]
        context = ReportContext(notes=notes, language=language)
        return PdfGenerationRequest(context=context, selected_cards=cards)

    def test_returns_bytes(self):
        pdf_bytes = build_pdf(self._make_request())
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

    def test_pdf_header(self):
        pdf_bytes = build_pdf(self._make_request())
        assert pdf_bytes[:5] == b'%PDF-'

    def test_multiple_cards(self):
        pdf_bytes = build_pdf(self._make_request(num_cards=6))
        assert pdf_bytes[:5] == b'%PDF-'

    def test_with_notes(self):
        pdf_bytes = build_pdf(self._make_request(notes='Some reflections here'))
        assert len(pdf_bytes) > 0

    def test_with_long_notes(self):
        long_notes = 'A' * 2000
        pdf_bytes = build_pdf(self._make_request(notes=long_notes))
        assert pdf_bytes[:5] == b'%PDF-'

    def test_different_languages(self):
        for lang in ('en', 'nl', 'ro'):
            pdf_bytes = build_pdf(self._make_request(language=lang))
            assert len(pdf_bytes) > 0
