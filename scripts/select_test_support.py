from __future__ import annotations

import os
import socket
import sys
import tempfile
import threading
import time
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8001
FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 4173


def wait_for_port(host: str, port: int, timeout_seconds: float = 15.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            if sock.connect_ex((host, port)) == 0:
                return
        time.sleep(0.1)
    raise RuntimeError(f"Timed out waiting for {host}:{port}")


@contextmanager
def temporary_storage_environment() -> Path:
    with tempfile.TemporaryDirectory(prefix="therapy-cards-nav-") as temp_dir:
        storage_dir = Path(temp_dir)
        original = {
            "APP_STORAGE_DIR": os.environ.get("APP_STORAGE_DIR"),
            "User_Name": os.environ.get("User_Name"),
            "Password": os.environ.get("Password"),
            "SESSION_LINK_SECRET": os.environ.get("SESSION_LINK_SECRET"),
            "FRONTEND_APP_URL": os.environ.get("FRONTEND_APP_URL"),
            "FRONTEND_ORIGINS": os.environ.get("FRONTEND_ORIGINS"),
        }

        os.environ["APP_STORAGE_DIR"] = str(storage_dir)
        os.environ["User_Name"] = "admin"
        os.environ["Password"] = "secret"
        os.environ["SESSION_LINK_SECRET"] = "navigation-smoke-secret"
        os.environ["FRONTEND_APP_URL"] = f"http://{FRONTEND_HOST}:{FRONTEND_PORT}"
        os.environ["FRONTEND_ORIGINS"] = f"http://{FRONTEND_HOST}:{FRONTEND_PORT}"

        try:
            yield storage_dir
        finally:
            for key, value in original.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value


@contextmanager
def frontend_static_server() -> None:
    if not FRONTEND_DIST_DIR.exists():
        raise RuntimeError(
            f"Frontend build output is missing at {FRONTEND_DIST_DIR}. Run the frontend build first."
        )

    handler = partial(SimpleHTTPRequestHandler, directory=str(FRONTEND_DIST_DIR))
    httpd = ThreadingHTTPServer((FRONTEND_HOST, FRONTEND_PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    try:
        wait_for_port(FRONTEND_HOST, FRONTEND_PORT)
        yield
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)


@contextmanager
def backend_server():
    sys.path.insert(0, str(BACKEND_DIR))
    import uvicorn
    from main import app

    config = uvicorn.Config(app, host=BACKEND_HOST, port=BACKEND_PORT, log_level="error")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    try:
        wait_for_port(BACKEND_HOST, BACKEND_PORT)
        yield
    finally:
        server.should_exit = True
        thread.join(timeout=10)
        if str(BACKEND_DIR) in sys.path:
            sys.path.remove(str(BACKEND_DIR))


def seed_navigation_session() -> str:
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))

    from app.services.config_service import save_configuration
    from app.services.session_link_service import create_session_link
    from app.services.session_registry_service import clear_active_sessions

    save_configuration(
        {
            "select_cards_blocked": False,
            "theme_labels": {
                "en": [f"Label {index + 1}" for index in range(6)],
                "nl": [f"Label {index + 1}" for index in range(6)],
                "ro": [f"Label {index + 1}" for index in range(6)],
            },
            "card_labels": {
                "1": [1],
                "2": [1],
                "3": [1],
                "4": [1],
                "5": [1],
                "6": [1],
                "7": [1],
                "8": [1],
            },
        }
    )
    clear_active_sessions()
    session = create_session_link("Navigation Smoke", 1)
    return str(session["session_url"])


@contextmanager
def session_test_environment():
    with temporary_storage_environment():
        session_url = seed_navigation_session()
        with backend_server(), frontend_static_server():
            yield session_url
