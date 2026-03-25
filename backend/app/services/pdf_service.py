from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import PdfGenerationRequest, SelectedCard


ROOT_DIR = Path(__file__).resolve().parents[3]
CARD_ASSET_DIR = ROOT_DIR / 'frontend' / 'public' / 'cards'
CARD_IMAGE_SIZE = 5.15 * cm
MAX_NOTES_CHARS = 900
MAX_NOTES_LINES = 10


def _create_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name='OverviewTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name='CardCaption',
            parent=styles['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=11.5,
            alignment=1,
            textColor=colors.HexColor('#0f172a'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='NotesLabel',
            parent=styles['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=10.5,
            leading=13,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name='NotesBody',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=9.2,
            leading=12,
            textColor=colors.HexColor('#334155'),
        )
    )
    return styles


def _card_image_path(card_id: int) -> Path:
    return CARD_ASSET_DIR / f'cards_l{card_id:03d}.png'


def _build_card_image(card_id: int):
    image_path = _card_image_path(card_id)
    if image_path.exists():
        image = Image(str(image_path))
        image.drawWidth = CARD_IMAGE_SIZE
        image.drawHeight = CARD_IMAGE_SIZE
        return image

    fallback = Table([['Image unavailable']], colWidths=[CARD_IMAGE_SIZE], rowHeights=[CARD_IMAGE_SIZE])
    fallback.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#64748b')),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ]
        )
    )
    return fallback


def _build_card_cell(card: SelectedCard, slot_number: int, styles):
    cell = Table(
        [
            [_build_card_image(card.id)],
            [Paragraph(f'{slot_number}. Card #{card.id:03d}', styles['CardCaption'])],
        ],
        colWidths=[CARD_IMAGE_SIZE + 0.2 * cm],
    )
    cell.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
            ]
        )
    )
    return cell


def _build_cards_grid(selected_cards: list[SelectedCard], styles) -> Table:
    cells = [_build_card_cell(card, index, styles) for index, card in enumerate(selected_cards[:6], start=1)]
    rows = []
    for start_index in range(0, len(cells), 3):
        row = cells[start_index:start_index + 3]
        while len(row) < 3:
            row.append('')
        rows.append(row)

    if not rows:
        rows = [['', '', '']]

    grid = Table(rows, colWidths=[6.0 * cm, 6.0 * cm, 6.0 * cm], hAlign='CENTER')
    grid.setStyle(
        TableStyle(
            [
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]
        )
    )
    return grid


def _truncate_notes(notes: str | None) -> str:
    if not notes:
        return 'No notes added.'

    lines = [line.strip() for line in notes.replace('\r\n', '\n').split('\n')]
    compact_lines = [line for line in lines if line]
    if not compact_lines:
        return 'No notes added.'

    clipped_lines = compact_lines[:MAX_NOTES_LINES]
    joined = '\n'.join(clipped_lines)
    if len(joined) > MAX_NOTES_CHARS:
        joined = joined[:MAX_NOTES_CHARS].rstrip()
        joined = f'{joined}...'
    elif len(compact_lines) > MAX_NOTES_LINES:
        joined = f'{joined}...'
    return joined


def _notes_paragraph(notes: str | None, styles) -> Paragraph:
    truncated = _truncate_notes(notes)
    html = '<br/>'.join(escape(line) for line in truncated.split('\n'))
    return Paragraph(html, styles['NotesBody'])


def build_pdf(payload: PdfGenerationRequest) -> bytes:
    styles = _create_styles()
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.1 * cm,
        rightMargin=1.1 * cm,
        topMargin=1.0 * cm,
        bottomMargin=1.0 * cm,
        title='Therapy Card Reflection Overview',
        author='Therapy Cards App',
    )

    story = [
        Paragraph('Therapy Card Reflection Overview', styles['OverviewTitle']),
        Spacer(1, 0.15 * cm),
        _build_cards_grid(payload.selected_cards, styles),
        Spacer(1, 0.35 * cm),
        Paragraph('Notes:', styles['NotesLabel']),
        _notes_paragraph(payload.context.notes, styles),
    ]

    document.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
