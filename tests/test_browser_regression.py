import contextlib
import os
import socket
import sqlite3
import tempfile
import threading
import time
import unittest
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright
from werkzeug.serving import make_server

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'Select_Cards'))
import server  # noqa: E402


class LiveServerThread(threading.Thread):
    def __init__(self, host, port):
        super().__init__(daemon=True)
        self.server = make_server(host, port, server.app)

    def run(self):
        self.server.serve_forever()

    def shutdown(self):
        self.server.shutdown()


def find_free_port():
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def find_playwright_chromium_executable():
    candidate_base_dirs = []

    local_app_data = os.environ.get('LOCALAPPDATA')
    if local_app_data:
        candidate_base_dirs.append(Path(local_app_data) / 'ms-playwright')

    candidate_base_dirs.append(Path.home() / 'AppData' / 'Local' / 'ms-playwright')

    repo_path = Path(__file__).resolve()
    for parent in repo_path.parents:
        if parent.name.lower() == 'users':
            continue
        if parent.parent.name.lower() == 'users':
            candidate_base_dirs.append(parent / 'AppData' / 'Local' / 'ms-playwright')

    seen = set()
    for base_dir in candidate_base_dirs:
        normalized = str(base_dir).lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        candidates = sorted(base_dir.glob('chromium-*/chrome-win64/chrome.exe'))
        if not candidates:
            candidates = sorted(base_dir.glob('chromium-*/chrome-win/chrome.exe'))
        if candidates:
            return str(candidates[-1])

    return None


class BrowserRegressionTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = str(Path(cls.temp_dir.name) / 'browser_state.sqlite3')
        server.app.config['TESTING'] = True
        server.app.config['STATE_DB_PATH'] = cls.db_path

        cls.port = find_free_port()
        cls.base_url = f'http://127.0.0.1:{cls.port}'
        cls.server_thread = LiveServerThread('127.0.0.1', cls.port)
        cls.server_thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server_thread.shutdown()
        cls.temp_dir.cleanup()

    def setUp(self):
        connection = sqlite3.connect(self.db_path)
        try:
            connection.execute('DROP TABLE IF EXISTS app_sessions')
            connection.commit()
        finally:
            connection.close()

    def prepare_stateful_session(self, card_label_data=None):
        session = requests.Session()
        theme_payload = {}
        for index in range(1, 7):
            theme_payload[f'label_{index}_en'] = f'English {index}'
            theme_payload[f'label_{index}_nl'] = f'Dutch {index}'
            theme_payload[f'label_{index}_ro'] = f'Romanian {index}'

        response = session.post(f'{self.base_url}/themes', data=theme_payload, allow_redirects=False)
        self.assertEqual(response.status_code, 302)

        assignments = card_label_data or {
            'card_1_labels': ['1'],
            'card_2_labels': ['1'],
            'card_3_labels': ['2'],
        }
        response = session.post(f'{self.base_url}/card-labels', data=assignments, allow_redirects=False)
        self.assertEqual(response.status_code, 302)
        return session

    def new_browser_context_with_session(self, playwright, seeded_session):
        executable_path = find_playwright_chromium_executable()
        self.assertIsNotNone(executable_path)

        browser = playwright.chromium.launch(headless=True, executable_path=executable_path)
        context = browser.new_context()
        context.add_cookies([
            {
                'name': cookie.name,
                'value': cookie.value,
                'domain': '127.0.0.1',
                'path': '/',
                'httpOnly': False,
                'secure': False,
                'sameSite': 'Lax',
            }
            for cookie in seeded_session.cookies
        ])
        return browser, context

    def test_filtered_selected_card_remains_visible_and_bounded(self):
        seeded_session = self.prepare_stateful_session()

        with sync_playwright() as playwright:
            browser, context = self.new_browser_context_with_session(playwright, seeded_session)
            page = context.new_page()
            page.goto(f'{self.base_url}/select-cards', wait_until='networkidle')

            page.select_option('#filter-select', '1')
            page.wait_for_timeout(150)
            page.dblclick('#card-1')
            page.wait_for_timeout(150)

            self.assertTrue(page.locator('#slot-1').is_visible())
            self.assertFalse(page.locator('#slot-1').evaluate("node => node.classList.contains('hidden-by-filter')"))
            self.assertTrue(page.locator('#slot-1 .card').is_visible())
            self.assertTrue(page.locator('#slot-1 .card').evaluate("node => node.classList.contains('selected-in-gallery')"))

            page.hover('#slot-1 .card')
            transform = page.locator('#slot-1 .card').evaluate("node => getComputedStyle(node).transform")
            self.assertEqual(transform, 'none')

            slot_box = page.locator('#slot-1').bounding_box()
            card_box = page.locator('#slot-1 .card').bounding_box()
            self.assertIsNotNone(slot_box)
            self.assertIsNotNone(card_box)
            self.assertGreaterEqual(card_box['x'], slot_box['x'] - 1)
            self.assertGreaterEqual(card_box['y'], slot_box['y'] - 1)
            self.assertLessEqual(card_box['x'] + card_box['width'], slot_box['x'] + slot_box['width'] + 1)
            self.assertLessEqual(card_box['y'] + card_box['height'], slot_box['y'] + slot_box['height'] + 1)

            browser.close()

    def test_selection_reorder_finalize_and_overview_order(self):
        seeded_session = self.prepare_stateful_session()

        with sync_playwright() as playwright:
            browser, context = self.new_browser_context_with_session(playwright, seeded_session)
            page = context.new_page()
            page.goto(f'{self.base_url}/select-cards', wait_until='networkidle')

            page.dblclick('#card-1')
            page.dblclick('#card-2')
            page.wait_for_timeout(200)

            page.evaluate(
                """
                () => {
                  const source = document.querySelector('#dropzone-1 .card');
                  const target = document.querySelector('#dropzone-3');
                  const dataTransfer = new DataTransfer();
                  dataTransfer.setData('text/plain', source.dataset.id);
                  source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
                  target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
                  target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
                  source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
                }
                """
            )
            page.wait_for_timeout(200)

            self.assertTrue(page.locator('#dropzone-1').evaluate("node => node.classList.contains('empty')"))
            self.assertFalse(page.locator('#dropzone-3').evaluate("node => node.classList.contains('empty')"))

            page.click('#finalize-btn')
            page.wait_for_url(f'{self.base_url}/overview_cards')

            image_sources = page.locator('#card-container .card img').evaluate_all(
                "nodes => nodes.map(node => node.getAttribute('src'))"
            )
            self.assertEqual(len(image_sources), 2)
            self.assertTrue(image_sources[0].endswith('cards_l002.png'))
            self.assertTrue(image_sources[1].endswith('cards_l001.png'))

            browser.close()

    def test_filtered_hover_uses_inward_origin_for_right_and_bottom_edges(self):
        seeded_session = self.prepare_stateful_session({
            'card_1_labels': ['1'],
            'card_2_labels': ['1'],
            'card_3_labels': ['1'],
            'card_4_labels': ['1'],
        })

        with sync_playwright() as playwright:
            browser, context = self.new_browser_context_with_session(playwright, seeded_session)
            page = context.new_page()
            page.set_viewport_size({'width': 1280, 'height': 900})
            page.goto(f'{self.base_url}/select-cards', wait_until='networkidle')

            page.evaluate(
                """
                () => {
                  const wrapper = document.querySelector('.card-wrapper');
                  wrapper.style.maxWidth = '264px';
                  wrapper.style.margin = '0 auto';
                }
                """
            )
            page.select_option('#filter-select', '1')
            page.wait_for_timeout(150)
            page.hover('#card-4')

            self.assertTrue(
                page.locator('#card-4').evaluate(
                    "node => node.classList.contains('zoom-inward-bottom-right')"
                )
            )

            browser.close()


if __name__ == '__main__':
    unittest.main()
