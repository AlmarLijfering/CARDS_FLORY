from __future__ import annotations

import os
import re
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as HttpResponse

from app.models import (
    ActiveSessionResponse,
    AppConfigPayload,
    AuthSessionResponse,
    ClearSessionsResponse,
    LoginRequest,
    LoginResponse,
    PdfGenerationRequest,
    SessionStatusResponse,
    SessionLinkCreateRequest,
    SessionLinkCreateResponse,
    SessionLinkVerificationResponse,
)
from app.services.admin_auth_service import create_admin_token, verify_admin_token
from app.services.config_service import get_configuration, save_configuration
from app.services.pdf_service import build_pdf
from app.services.session_link_service import create_session_link, verify_session_link
from app.services.session_registry_service import clear_active_sessions, get_active_session, list_active_sessions


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


def _configured_login_credentials() -> tuple[str, str] | None:
    username = os.environ.get('User_Name', '').strip()
    password = os.environ.get('Password', '').strip()
    if not username or not password:
        return None
    return username, password


app = FastAPI(
    title='Therapy Cards PDF Service',
    version='1.0.0',
    summary='Stateless PDF generation for therapy card sessions',
)

ADMIN_SESSION_COOKIE = 'therapy_admin_session'
ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['*'],
)


def _cookie_settings_for_request(request: Request) -> dict[str, object]:
    origin = request.headers.get('origin', '').strip().lower()
    request_host = (request.url.hostname or '').strip().lower()
    origin_host = (urlparse(origin).hostname or '').strip().lower() if origin else ''
    is_local_origin = origin.startswith('http://localhost') or origin.startswith('http://127.0.0.1')

    if is_local_origin:
        return {
            'secure': False,
            'samesite': 'lax',
        }

    request_parts = request_host.split('.')
    origin_parts = origin_host.split('.')
    shares_site = (
        len(request_parts) >= 2
        and len(origin_parts) >= 2
        and request_parts[-2:] == origin_parts[-2:]
    )

    if shares_site:
        return {
            'secure': True,
            'samesite': 'lax',
        }

    return {
        'secure': True,
        'samesite': 'none',
    }


def _set_admin_session_cookie(response: Response, request: Request, token: str) -> None:
    cookie_settings = _cookie_settings_for_request(request)
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=bool(cookie_settings['secure']),
        samesite=str(cookie_settings['samesite']),
        max_age=ADMIN_SESSION_TTL_SECONDS,
        path='/',
    )


def _clear_admin_session_cookie(response: Response, request: Request) -> None:
    cookie_settings = _cookie_settings_for_request(request)
    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE,
        httponly=True,
        secure=bool(cookie_settings['secure']),
        samesite=str(cookie_settings['samesite']),
        path='/',
    )


def _extract_admin_token(request: Request) -> str | None:
    cookie_token = request.cookies.get(ADMIN_SESSION_COOKIE)
    if cookie_token:
        return cookie_token

    authorization = request.headers.get('authorization', '').strip()
    if authorization.lower().startswith('bearer '):
        bearer_token = authorization[7:].strip()
        return bearer_token or None

    return None


@app.get('/api/health')
async def healthcheck():
    return {'status': 'ok'}


@app.post('/api/auth/login', response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response):
    credentials = _configured_login_credentials()
    if credentials is None:
        raise HTTPException(status_code=503, detail='Configuration login is not configured on the backend.')

    expected_username, expected_password = credentials
    if payload.username != expected_username or payload.password != expected_password:
        raise HTTPException(status_code=401, detail='Invalid username or password.')

    access_token = create_admin_token(expected_username)
    _set_admin_session_cookie(response, request, access_token)
    return {'ok': True, 'access_token': access_token}


@app.get('/api/auth/session', response_model=AuthSessionResponse)
async def get_auth_session(request: Request):
    token = _extract_admin_token(request)
    if not token:
        return {'authenticated': False}

    try:
        verify_admin_token(token)
    except (LookupError, ValueError):
        return {'authenticated': False}

    return {'authenticated': True}


@app.post('/api/auth/logout', response_model=LoginResponse)
async def logout(request: Request, response: Response):
    _clear_admin_session_cookie(response, request)
    return {'ok': True}


def require_admin_session(request: Request) -> dict[str, str]:
    token = _extract_admin_token(request)
    if not token:
        raise HTTPException(status_code=401, detail='Login is required for this action.')

    try:
        return verify_admin_token(token)
    except LookupError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=401, detail='Invalid admin session. Please log in again.') from error


@app.get('/api/config', response_model=AppConfigPayload)
async def read_configuration():
    return get_configuration()


@app.put('/api/config', response_model=AppConfigPayload)
async def update_configuration(payload: AppConfigPayload, _admin_session: dict[str, str] = Depends(require_admin_session)):
    return save_configuration(payload.model_dump())


@app.post('/api/generate-pdf')
async def generate_pdf(payload: PdfGenerationRequest):
    pdf_bytes = build_pdf(payload)
    filename = _report_filename(payload.context.session_title)
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return HttpResponse(content=pdf_bytes, media_type='application/pdf', headers=headers)


@app.post('/api/session-links', response_model=SessionLinkCreateResponse)
async def create_unique_session_link(payload: SessionLinkCreateRequest, _admin_session: dict[str, str] = Depends(require_admin_session)):
    return create_session_link(payload.session_name, payload.session_label_id)


@app.get('/api/session-links/{token}', response_model=SessionLinkVerificationResponse)
async def validate_session_link(token: str):
    try:
        return verify_session_link(token)
    except LookupError as error:
        raise HTTPException(status_code=410, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get('/api/sessions/{session_key}', response_model=SessionStatusResponse)
async def get_session_status(session_key: str):
    try:
        return get_active_session(session_key)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get('/api/sessions', response_model=list[ActiveSessionResponse])
async def get_active_sessions(_admin_session: dict[str, str] = Depends(require_admin_session)):
    return list_active_sessions()


@app.delete('/api/sessions', response_model=ClearSessionsResponse)
async def clear_sessions(_admin_session: dict[str, str] = Depends(require_admin_session)):
    return {'cleared_count': clear_active_sessions()}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=int(os.environ.get('PORT', '8001')), reload=True)
