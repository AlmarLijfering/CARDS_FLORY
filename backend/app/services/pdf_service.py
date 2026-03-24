from __future__ import annotations

from io import BytesIO
from math import ceil
from pathlib import Path

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, Line
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import ChartSeries, PdfGenerationRequest, SelectedCard


ROOT_DIR = Path(__file__).resolve().parents[3]
CARD_ASSET_DIR = ROOT_DIR / 'frontend' / 'public' / 'cards'
PAGE_WIDTH, PAGE_HEIGHT = A4


def _safe_text(value: str | None, fallback: str = 'Not provided') -> str:
    return value if value else fallback


def _create_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1d4ed8'),
            spaceAfter=8,
            spaceBefore=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name='BodyCopy',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor('#334155'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='MutedCopy',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748b'),
        )
    )
    styles.add(
        ParagraphStyle(
            name='CardHeading',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4,
        )
    )
    return styles


def _build_metadata_table(payload: PdfGenerationRequest) -> Table:
    rows = [
        ['Session', _safe_text(payload.context.session_title, 'Therapy card session')],
        ['Facilitator', _safe_text(payload.context.facilitator)],
        ['Client alias', _safe_text(payload.context.client_alias)],
        ['Language', payload.context.language.upper()],
        ['Selected cards', str(len(payload.selected_cards))],
    ]

    table = Table(rows, colWidths=[3.2 * cm, 12.8 * cm])
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#0f172a')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('LEADING', (0, 0), (-1, -1), 13),
                ('LEFTPADDING', (0, 0), (-1, -1), 9),
                ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _card_image_path(card_id: int) -> Path:
    return CARD_ASSET_DIR / f'cards_l{card_id:03d}.png'


def _build_card_image(card_id: int):
    image_path = _card_image_path(card_id)
    if image_path.exists():
        image = Image(str(image_path))
        image.drawWidth = 6.35 * cm
        image.drawHeight = 6.35 * cm
        return image

    fallback = Table(
        [[Paragraph('Image unavailable', _create_styles()['MutedCopy'])]],
        colWidths=[6.35 * cm],
        rowHeights=[6.35 * cm],
    )
    fallback.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ]
        )
    )
    return fallback


def _build_card_panel(card: SelectedCard, order: int, styles):
    labels_text = ', '.join(card.labels) if card.labels else 'No theme labels assigned'
    card_copy = [
        Paragraph(f'{order}. {card.title}', styles['CardHeading']),
        Paragraph(f'Card ID: {card.id:03d}', styles['BodyCopy']),
        Spacer(1, 0.12 * cm),
        Paragraph(f'Themes: {labels_text}', styles['BodyCopy']),
    ]
    if card.summary:
        card_copy.extend(
            [
                Spacer(1, 0.12 * cm),
                Paragraph(card.summary, styles['MutedCopy']),
            ]
        )

    table = Table(
        [[_build_card_image(card.id), card_copy]],
        colWidths=[6.9 * cm, 9.0 * cm],
        style=TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.white),
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 9),
                ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                ('TOPPADDING', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
            ]
        ),
    )
    return table


def _nice_axis_max(value: float) -> float:
    if value <= 5:
        return 5
    magnitude = 10 ** (len(str(int(value))) - 1)
    return ceil(value / magnitude) * magnitude


def _build_chart(series: ChartSeries) -> Drawing:
    drawing = Drawing(16.0 * cm, 8.2 * cm)
    chart = VerticalBarChart()
    chart.x = 1.2 * cm
    chart.y = 1.2 * cm
    chart.width = 12.8 * cm
    chart.height = 5.2 * cm
    chart.data = [[point.value for point in series.data]]
    chart.categoryAxis.categoryNames = [point.label for point in series.data]
    chart.categoryAxis.labels.angle = 20 if len(series.data) > 4 else 0
    chart.categoryAxis.labels.boxAnchor = 'ne'
    chart.categoryAxis.labels.dx = 0
    chart.categoryAxis.labels.dy = -2
    chart.categoryAxis.labels.fontName = 'Helvetica'
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = _nice_axis_max(max(point.value for point in series.data))
    chart.valueAxis.labels.fontName = 'Helvetica'
    chart.valueAxis.labels.fontSize = 8
    chart.bars[0].fillColor = colors.HexColor('#1d4ed8')
    chart.bars[0].strokeColor = colors.HexColor('#1e3a8a')
    chart.barSpacing = 6
    chart.groupSpacing = 14
    chart.strokeColor = colors.HexColor('#cbd5e1')
    drawing.add(chart)
    drawing.add(Line(1.0 * cm, 1.0 * cm, 14.5 * cm, 1.0 * cm, strokeColor=colors.HexColor('#e2e8f0')))
    return drawing


def _draw_page_chrome(canvas, _doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(PAGE_WIDTH - 1.5 * cm, 1.1 * cm, f'Page {canvas.getPageNumber()}')
    canvas.restoreState()


def build_pdf(payload: PdfGenerationRequest) -> bytes:
    styles = _create_styles()
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=payload.context.session_title or 'Therapy card session',
        author=payload.context.facilitator or 'Therapy Cards App',
    )

    story = [
        Paragraph(payload.context.session_title or 'Therapy Card Reflection Report', styles['ReportTitle']),
        Paragraph(
            'This report was generated on demand. The submitted card selection and notes are used only to build this PDF in memory and are not stored on the server.',
            styles['BodyCopy'],
        ),
        Spacer(1, 0.35 * cm),
        _build_metadata_table(payload),
    ]

    if payload.context.notes:
        story.extend(
            [
                Spacer(1, 0.4 * cm),
                Paragraph('Session notes', styles['SectionTitle']),
                Paragraph(payload.context.notes.replace('\n', '<br/>'), styles['BodyCopy']),
            ]
        )

    story.extend(
        [
            Spacer(1, 0.5 * cm),
            Paragraph('Selected cards', styles['SectionTitle']),
            Paragraph(
                'The final card order is preserved exactly as it was submitted from the browser session.',
                styles['BodyCopy'],
            ),
            Spacer(1, 0.2 * cm),
        ]
    )

    for index, card in enumerate(payload.selected_cards, start=1):
        story.append(_build_card_panel(card, index, styles))
        story.append(Spacer(1, 0.3 * cm))

    if payload.graphs:
        story.extend([PageBreak(), Paragraph('Session insights', styles['SectionTitle'])])
        for graph in payload.graphs:
            story.append(Paragraph(graph.title, styles['CardHeading']))
            if graph.description:
                story.append(Paragraph(graph.description, styles['BodyCopy']))
            story.append(Spacer(1, 0.12 * cm))
            story.append(_build_chart(graph))
            story.append(Spacer(1, 0.35 * cm))

    document.build(story, onFirstPage=_draw_page_chrome, onLaterPages=_draw_page_chrome)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
