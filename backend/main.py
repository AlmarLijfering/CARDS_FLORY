from __future__ import annotations

import os
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.models import (
    PdfGenerationRequest,
    SessionLinkCreateResponse,
    SessionLinkVerificationResponse,
)
from app.services.pdf_service import build_pdf
from app.services.session_link_service import create_session_link, verify_session_link


def _allowed_origins() -> list[str]:
    configured = os.environ.get('FRONTEND_ORIGINS', '')
    origins = [origin.strip() for origin in configured.split(',') if origin.strip()]
    if not origins:
        origins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]

    render_frontend_url = os.environ.get('FRONTEND_URL')
    if render_frontend_url:
        origins.append(render_frontend_url.strip())

    deduplicated: list[str] = []
    for origin in origins:
        if origin and origin not in deduplicated:
            deduplicated.append(origin)
    return deduplicated


def _report_filename(session_title: str | None) -> str:
    base_name = session_title or 'therapy-card-overview'
    sanitized = re.sub(r'[^A-Za-z0-9_-]+', '-', base_name.strip()).strip('-').lower()
    if sanitized and not sanitized.endswith('-overview'):
        sanitized = f'{sanitized}-overview'
    return f'{sanitized or "therapy-card-overview"}.pdf'


app = FastAPI(
    title='Therapy Cards PDF Service',
    version='1.0.0',
    summary='Stateless PDF generation for therapy card sessions',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=['POST', 'GET', 'OPTIONS'],
    allow_headers=['*'],
)


@app.get('/api/health')
async def healthcheck():
    return {'status': 'ok'}


@app.post('/api/generate-pdf')
async def generate_pdf(payload: PdfGenerationRequest):
    pdf_bytes = build_pdf(payload)
    filename = _report_filename(payload.context.session_title)
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return Response(content=pdf_bytes, media_type='application/pdf', headers=headers)


@app.post('/api/session-links', response_model=SessionLinkCreateResponse)
async def create_unique_session_link():
    return create_session_link()


@app.get('/api/session-links/{token}', response_model=SessionLinkVerificationResponse)
async def validate_session_link(token: str):
    try:
        return verify_session_link(token)
    except LookupError as error:
        raise HTTPException(status_code=410, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=int(os.environ.get('PORT', '8001')), reload=True)
