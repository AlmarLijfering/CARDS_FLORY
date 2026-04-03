"""Integration tests for FastAPI endpoints."""
from __future__ import annotations

import pytest

from app.services.admin_auth_service import create_admin_token
from app.services.session_registry_service import register_active_session
from datetime import UTC, datetime, timedelta


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_health(api_client):
    resp = await api_client.get('/api/health')
    assert resp.status_code == 200
    assert resp.json() == {'status': 'ok'}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_login_success(api_client):
    resp = await api_client.post('/api/auth/login', json={'username': 'admin', 'password': 'secret'})
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is True
    assert body['access_token']

@pytest.mark.anyio
async def test_login_wrong_password(api_client):
    resp = await api_client.post('/api/auth/login', json={'username': 'admin', 'password': 'wrong'})
    assert resp.status_code == 401

@pytest.mark.anyio
async def test_login_wrong_username(api_client):
    resp = await api_client.post('/api/auth/login', json={'username': 'hacker', 'password': 'secret'})
    assert resp.status_code == 401

@pytest.mark.anyio
async def test_auth_session_unauthenticated(api_client):
    resp = await api_client.get('/api/auth/session')
    assert resp.status_code == 200
    assert resp.json()['authenticated'] is False

@pytest.mark.anyio
async def test_auth_session_with_bearer(api_client):
    token = create_admin_token('admin')
    resp = await api_client.get('/api/auth/session', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    assert resp.json()['authenticated'] is True

@pytest.mark.anyio
async def test_logout(api_client):
    resp = await api_client.post('/api/auth/logout')
    assert resp.status_code == 200
    assert resp.json()['ok'] is True


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_read_config_public(api_client):
    resp = await api_client.get('/api/config')
    assert resp.status_code == 200
    body = resp.json()
    assert 'select_cards_blocked' in body
    assert 'theme_labels' in body

@pytest.mark.anyio
async def test_update_config_requires_auth(api_client):
    resp = await api_client.put('/api/config', json={'select_cards_blocked': True})
    assert resp.status_code == 401

@pytest.mark.anyio
async def test_update_config_with_auth(api_client):
    token = create_admin_token('admin')
    payload = {
        'select_cards_blocked': True,
        'theme_labels': {
            'en': ['A', 'B', 'C', 'D', 'E', 'F'],
            'nl': ['A', 'B', 'C', 'D', 'E', 'F'],
            'ro': ['A', 'B', 'C', 'D', 'E', 'F'],
        },
        'card_labels': {'1': [1, 2]},
    }
    resp = await api_client.put(
        '/api/config',
        json=payload,
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body['select_cards_blocked'] is True
    assert body['theme_labels']['en'][0] == 'A'


# ---------------------------------------------------------------------------
# PDF generation
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_generate_pdf(api_client):
    payload = {
        'context': {'language': 'en'},
        'selected_cards': [{'id': 1, 'title': 'Card 001'}],
    }
    resp = await api_client.post('/api/generate-pdf', json=payload)
    assert resp.status_code == 200
    assert resp.headers['content-type'] == 'application/pdf'
    assert resp.content[:5] == b'%PDF-'

@pytest.mark.anyio
async def test_generate_pdf_custom_filename(api_client):
    payload = {
        'context': {'session_title': 'My Session', 'language': 'en'},
        'selected_cards': [{'id': 1, 'title': 'Card 001'}],
    }
    resp = await api_client.post('/api/generate-pdf', json=payload)
    assert resp.status_code == 200
    content_disp = resp.headers.get('content-disposition', '')
    assert 'my-session-overview.pdf' in content_disp

@pytest.mark.anyio
async def test_generate_pdf_empty_cards_rejected(api_client):
    payload = {
        'context': {'language': 'en'},
        'selected_cards': [],
    }
    resp = await api_client.post('/api/generate-pdf', json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_session_not_found(api_client):
    resp = await api_client.get('/api/sessions/nonexistent')
    assert resp.status_code == 404

@pytest.mark.anyio
async def test_get_registered_session(api_client):
    expires = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    register_active_session('test-key', expires, 'Test', 1, 'http://example.com')
    resp = await api_client.get('/api/sessions/test-key')
    assert resp.status_code == 200
    assert resp.json()['session_key'] == 'test-key'

@pytest.mark.anyio
async def test_list_sessions_requires_auth(api_client):
    resp = await api_client.get('/api/sessions')
    assert resp.status_code == 401

@pytest.mark.anyio
async def test_list_sessions_with_auth(api_client):
    token = create_admin_token('admin')
    resp = await api_client.get('/api/sessions', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.anyio
async def test_clear_sessions_requires_auth(api_client):
    resp = await api_client.delete('/api/sessions')
    assert resp.status_code == 401

@pytest.mark.anyio
async def test_clear_sessions_with_auth(api_client):
    token = create_admin_token('admin')
    expires = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    register_active_session('to-clear', expires, 'C', 1, '')
    resp = await api_client.delete('/api/sessions', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    assert resp.json()['cleared_count'] >= 1
