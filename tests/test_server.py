import io
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'Select_Cards'))
import server  # noqa: E402


class ServerRoutesTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.temp_dir.name) / 'test_state.sqlite3')
        server.app.config['TESTING'] = True
        server.app.config['STATE_DB_PATH'] = self.db_path
        self.client = server.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def read_stored_payloads(self):
        connection = sqlite3.connect(self.db_path)
        try:
            rows = connection.execute('SELECT payload FROM app_sessions').fetchall()
        finally:
            connection.close()
        return [json.loads(row[0]) for row in rows]

    def multilingual_theme_payload(self):
        payload = {}
        for index in range(1, 7):
            payload[f'label_{index}_en'] = f'English {index}'
            payload[f'label_{index}_nl'] = f'Dutch {index}'
            payload[f'label_{index}_ro'] = f'Romanian {index}'
        return payload

    def test_root_renders_landing_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Choose an application', body)
        self.assertIn('Configuration', body)

    def test_configuration_page_renders(self):
        response = self.client.get('/configuration')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Manage labels and access', body)
        self.assertIn('select_cards_blocked', body)
        self.assertIn('Theme Labels', body)
        self.assertIn('Card Labels', body)

    def test_select_cards_route_renders_cards_page(self):
        self.client.post('/card-labels', data={
            'card_1_labels': ['1'],
            'card_3_labels': ['3'],
        })
        response = self.client.get('/select-cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Your selection', body)
        self.assertIn('select_cards.js', body)
        self.assertIn('data-label-en=', body)
        self.assertIn('data-label-nl=', body)
        self.assertIn('data-label-ro=', body)
        self.assertIn('value="1"', body)
        self.assertIn('value="3"', body)
        self.assertNotIn('value="2"', body)

    def test_themes_page_renders(self):
        response = self.client.get('/themes')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Theme labels', body)
        self.assertIn('label_1_en', body)
        self.assertIn('label_1_nl', body)
        self.assertIn('label_1_ro', body)

    def test_themes_page_saves_labels_to_server_side_state(self):
        response = self.client.post('/themes', data=self.multilingual_theme_payload())
        self.assertEqual(response.status_code, 302)

        stored = self.read_stored_payloads()
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0]['theme_labels']['en'][0], 'English 1')
        self.assertEqual(stored[0]['theme_labels']['nl'][0], 'Dutch 1')
        self.assertEqual(stored[0]['theme_labels']['ro'][0], 'Romanian 1')
        self.assertFalse(stored[0]['select_cards_blocked'])

    def test_configuration_page_can_block_select_cards(self):
        payload = self.multilingual_theme_payload()
        self.client.post('/themes', data=payload)
        response = self.client.post('/configuration', data={'select_cards_blocked': 'on'})
        self.assertEqual(response.status_code, 302)

        stored = self.read_stored_payloads()
        self.assertTrue(stored[0]['select_cards_blocked'])

    def test_card_labels_page_renders(self):
        response = self.client.get('/card-labels')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Card labels', body)
        self.assertIn('card_labels.js', body)

    def test_card_labels_page_stays_english(self):
        self.client.post('/themes', data=self.multilingual_theme_payload())
        response = self.client.get('/card-labels')
        body = response.get_data(as_text=True)
        self.assertIn('1 - English 1', body)
        self.assertNotIn('1 - Dutch 1', body)
        self.assertNotIn('1 - Romanian 1', body)

    def test_card_labels_page_saves_unique_labels(self):
        response = self.client.post('/card-labels', data={
            'card_1_labels': ['1', '1', '2'],
            'card_2_labels': ['6'],
            'card_200_labels': ['4'],
        })
        self.assertEqual(response.status_code, 302)

        stored = self.read_stored_payloads()
        self.assertEqual(stored[0]['card_labels']['1'], [1, 2])
        self.assertEqual(stored[0]['card_labels']['2'], [6])
        self.assertNotIn('200', stored[0]['card_labels'])

    def test_finalize_accepts_valid_cards(self):
        response = self.client.post('/finalize', json={'selectedCards': ['1', '2', '3']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'success')

    def test_finalize_persists_language(self):
        response = self.client.post('/finalize', json={'selectedCards': ['1', '2'], 'language': 'nl'})
        self.assertEqual(response.status_code, 200)

        stored = self.read_stored_payloads()
        self.assertEqual(stored[0]['language'], 'nl')

    def test_set_language_route(self):
        response = self.client.post('/set-language', json={'language': 'ro'})
        self.assertEqual(response.status_code, 200)

        stored = self.read_stored_payloads()
        self.assertEqual(stored[0]['language'], 'ro')

    def test_finalize_rejects_non_json_payload(self):
        response = self.client.post('/finalize', data='not-json', content_type='text/plain')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['status'], 'error')

    def test_finalize_rejects_out_of_range_ids(self):
        response = self.client.post('/finalize', json={'selectedCards': [113]})
        self.assertEqual(response.status_code, 400)
        self.assertIn('between', response.get_json()['message'])

    def test_finalize_rejects_more_than_max_cards(self):
        response = self.client.post('/finalize', json={'selectedCards': [1, 2, 3, 4, 5, 6, 7]})
        self.assertEqual(response.status_code, 400)
        self.assertIn('maximum', response.get_json()['message'])

    def test_finalize_rejects_duplicate_ids(self):
        response = self.client.post('/finalize', json={'selectedCards': [4, 4]})
        self.assertEqual(response.status_code, 400)
        self.assertIn('Duplicate', response.get_json()['message'])

    def test_select_cards_route_respects_block_setting(self):
        payload = self.multilingual_theme_payload()
        self.client.post('/themes', data=payload)
        self.client.post('/configuration', data={'select_cards_blocked': 'on'})

        response = self.client.get('/select-cards')
        self.assertEqual(response.status_code, 403)
        self.assertIn('currently blocked', response.get_data(as_text=True))

    def test_finalize_rejects_when_select_cards_is_blocked(self):
        payload = self.multilingual_theme_payload()
        self.client.post('/themes', data=payload)
        self.client.post('/configuration', data={'select_cards_blocked': 'on'})

        response = self.client.post('/finalize', json={'selectedCards': ['1', '2']})
        self.assertEqual(response.status_code, 403)
        self.assertIn('blocked', response.get_json()['message'])

    def test_overview_reads_from_server_side_state(self):
        self.client.post('/finalize', json={'selectedCards': ['4', '5']})
        response = self.client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('cards_l004.png', body)
        self.assertIn('cards_l005.png', body)

    def test_overview_handles_invalid_stored_cards(self):
        self.client.post('/set-language', json={'language': 'en'})
        stored = self.read_stored_payloads()
        stored[0]['selected_cards'] = ['4', 'invalid']

        connection = sqlite3.connect(self.db_path)
        try:
            connection.execute(
                'UPDATE app_sessions SET payload = ?',
                (json.dumps(stored[0]),),
            )
            connection.commit()
        finally:
            connection.close()

        response = self.client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('cards_l004.png', response.get_data(as_text=True))

    def test_overview_uses_session_language(self):
        self.client.post('/set-language', json={'language': 'nl'})
        response = self.client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        self.assertIn('"nl"', response.get_data(as_text=True))
        self.assertIn('overview_cards.js', response.get_data(as_text=True))

    def test_export_labels_bundle_includes_multilingual_theme_labels_and_assignments(self):
        self.client.post('/themes', data=self.multilingual_theme_payload())
        self.client.post('/card-labels', data={'card_1_labels': ['1', '2'], 'card_2_labels': ['6']})
        response = self.client.get('/card-labels/export')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/json')
        payload = response.get_json()
        self.assertEqual(len(payload['theme_labels']['en']), 6)
        self.assertEqual(payload['theme_labels']['nl'][0], 'Dutch 1')
        self.assertEqual(payload['card_labels']['1'], [1, 2])

    def test_import_labels_bundle_sets_theme_and_assignments(self):
        bundle = io.BytesIO(
            (
                b'{"theme_labels": {"en": ["A", "B", "C", "D", "E", "F"], '
                b'"nl": ["NA", "NB", "NC", "ND", "NE", "NF"], '
                b'"ro": ["RA", "RB", "RC", "RD", "RE", "RF"]}, '
                b'"card_labels": {"5": [1, 4], "7": [3]}}'
            )
        )
        response = self.client.post(
            '/card-labels/import',
            data={'bundle_file': (bundle, 'labels.json')},
            content_type='multipart/form-data',
        )
        self.assertEqual(response.status_code, 302)

        stored = self.read_stored_payloads()
        self.assertEqual(stored[0]['theme_labels']['en'][0], 'A')
        self.assertEqual(stored[0]['theme_labels']['nl'][0], 'NA')
        self.assertEqual(stored[0]['card_labels']['5'], [1, 4])

    def test_card_labels_screen_has_filter_controls(self):
        response = self.client.get('/card-labels')
        body = response.get_data(as_text=True)
        self.assertIn('id="card-search"', body)
        self.assertIn('id="label-filter"', body)
        self.assertIn('id="assignment-filter"', body)

    def test_large_assignment_payload_does_not_expand_cookie(self):
        payload = {f'card_{card_id}_labels': ['1', '2', '3', '4', '5', '6'] for card_id in range(1, 113)}
        response = self.client.post('/card-labels', data=payload)
        self.assertEqual(response.status_code, 302)
        set_cookie = response.headers.get('Set-Cookie', '')
        self.assertLess(len(set_cookie), 300)
        self.assertIn(server.STATE_COOKIE_NAME, set_cookie)


if __name__ == '__main__':
    unittest.main()
