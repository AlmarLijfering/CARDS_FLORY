from __future__ import annotations

import os
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def _isolated_storage(tmp_path):
    """Point all file-backed services at a temporary directory."""
    os.environ['APP_STORAGE_DIR'] = str(tmp_path)
    yield
    os.environ.pop('APP_STORAGE_DIR', None)


@pytest.fixture(autouse=True)
def _test_credentials():
    """Set admin credentials for login tests."""
    os.environ['User_Name'] = 'admin'
    os.environ['Password'] = 'secret'
    yield
    os.environ.pop('User_Name', None)
    os.environ.pop('Password', None)


@pytest.fixture()
def api_client():
    """Async HTTPX client wired to the FastAPI app."""
    from main import app
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url='http://test')
