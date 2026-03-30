from __future__ import annotations

import os
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"


@contextmanager
def temporary_admin_environment():
    with tempfile.TemporaryDirectory(prefix="therapy-admin-auth-") as temp_dir:
        original = {
            "APP_STORAGE_DIR": os.environ.get("APP_STORAGE_DIR"),
            "User_Name": os.environ.get("User_Name"),
            "Password": os.environ.get("Password"),
            "SESSION_LINK_SECRET": os.environ.get("SESSION_LINK_SECRET"),
            "ADMIN_AUTH_SECRET": os.environ.get("ADMIN_AUTH_SECRET"),
            "FRONTEND_ORIGINS": os.environ.get("FRONTEND_ORIGINS"),
        }

        os.environ["APP_STORAGE_DIR"] = temp_dir
        os.environ["User_Name"] = "admin"
        os.environ["Password"] = "secret"
        os.environ["SESSION_LINK_SECRET"] = "session-link-secret"
        os.environ["ADMIN_AUTH_SECRET"] = "admin-auth-secret"
        os.environ["FRONTEND_ORIGINS"] = "https://apps.lijfering.eu"

        try:
            yield
        finally:
            for key, value in original.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value


def main() -> int:
    with temporary_admin_environment():
        sys.path.insert(0, str(BACKEND_DIR))
        try:
            from main import app

            with TestClient(app, base_url="https://api.lijfering.eu") as client:
                login_response = client.post(
                    "/api/auth/login",
                    json={"username": "admin", "password": "secret"},
                    headers={"Origin": "https://apps.lijfering.eu"},
                )
                assert login_response.status_code == 200, login_response.text
                payload = login_response.json()
                assert payload.get("ok") is True
                access_token = payload.get("access_token")
                assert isinstance(access_token, str) and access_token

                set_cookie = login_response.headers.get("set-cookie", "").lower()
                assert "secure" in set_cookie
                assert "samesite=lax" in set_cookie

                client.cookies.clear()
                auth_headers = {"Authorization": f"Bearer {access_token}"}

                session_response = client.get("/api/auth/session", headers=auth_headers)
                assert session_response.status_code == 200, session_response.text
                assert session_response.json().get("authenticated") is True

                config_response = client.put(
                    "/api/config",
                    json={
                        "select_cards_blocked": False,
                        "theme_labels": {
                            "en": [f"Label {index + 1}" for index in range(6)],
                            "nl": [f"Label {index + 1}" for index in range(6)],
                            "ro": [f"Label {index + 1}" for index in range(6)],
                        },
                        "card_labels": {"1": [1], "2": [1]},
                    },
                    headers=auth_headers,
                )
                assert config_response.status_code == 200, config_response.text

                session_link_response = client.post(
                    "/api/session-links",
                    json={"session_name": "Safari Session", "session_label_id": 1},
                    headers=auth_headers,
                )
                assert session_link_response.status_code == 200, session_link_response.text
        finally:
            if str(BACKEND_DIR) in sys.path:
                sys.path.remove(str(BACKEND_DIR))

    print("Admin auth Safari smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
