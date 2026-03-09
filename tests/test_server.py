import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'Select_Cards'))
import server  # noqa: E402


class ServerRoutesTestCase(unittest.TestCase):
    def setUp(self):
        server.app.config['TESTING'] = True
        self.client = server.app.test_client()

    def test_root_renders_landing_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Choose an application', body)

    def test_select_cards_route_renders_cards_page(self):
        response = self.client.get('/select-cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Your selection', body)

    def test_themes_page_renders(self):
        response = self.client.get('/themes')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Theme labels', body)

    def test_themes_page_saves_labels(self):
        payload = {f'label_{index}': f'My label {index}' for index in range(1, 7)}
        with self.client as client:
            response = client.post('/themes', data=payload)
            self.assertEqual(response.status_code, 302)
            with client.session_transaction() as session_data:
                self.assertEqual(session_data['theme_labels'][0], 'My label 1')
                self.assertEqual(len(session_data['theme_labels']), 6)

    def test_card_labels_page_renders(self):
        response = self.client.get('/card-labels')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('Card labels', body)

    def test_card_labels_page_saves_unique_labels(self):
        with self.client as client:
            response = client.post('/card-labels', data={
                'card_1_labels': ['1', '1', '2'],
                'card_2_labels': ['6'],
                'card_200_labels': ['4'],
            })
            self.assertEqual(response.status_code, 302)
            with client.session_transaction() as session_data:
                self.assertEqual(session_data['card_labels']['1'], [1, 2])
                self.assertEqual(session_data['card_labels']['2'], [6])
                self.assertNotIn('200', session_data['card_labels'])

    def test_finalize_accepts_valid_cards(self):
        response = self.client.post('/finalize', json={'selectedCards': ['1', '2', '3']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'success')

    def test_finalize_persists_language(self):
        with self.client as client:
            response = client.post('/finalize', json={'selectedCards': ['1', '2'], 'language': 'nl'})
            self.assertEqual(response.status_code, 200)
            with client.session_transaction() as session_data:
                self.assertEqual(session_data['language'], 'nl')

    def test_set_language_route(self):
        with self.client as client:
            response = client.post('/set-language', json={'language': 'ro'})
            self.assertEqual(response.status_code, 200)
            with client.session_transaction() as session_data:
                self.assertEqual(session_data['language'], 'ro')

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

    def test_overview_reads_from_session(self):
        with self.client as client:
            client.post('/finalize', json={'selectedCards': ['4', '5']})
            response = client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('cards_l004.png', body)
        self.assertIn('cards_l005.png', body)

    def test_overview_handles_invalid_session_cards(self):
        with self.client as client:
            with client.session_transaction() as session_data:
                session_data['selected_cards'] = ['4', 'invalid']
            response = client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertNotIn('cards_l004.png', body)

    def test_overview_uses_session_language(self):
        with self.client as client:
            with client.session_transaction() as session_data:
                session_data['language'] = 'nl'
            response = client.get('/overview_cards')
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn('"nl"', body)

    def test_export_labels_bundle_includes_theme_and_assignments(self):
        with self.client as client:
            with client.session_transaction() as session_data:
                session_data['theme_labels'] = [f'Label {i}' for i in range(1, 7)]
                session_data['card_labels'] = {'1': [1, 2], '2': [6]}
            response = client.get('/card-labels/export')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/json')
        payload = response.get_json()
        self.assertEqual(len(payload['theme_labels']), 6)
        self.assertEqual(payload['card_labels']['1'], [1, 2])

    def test_import_labels_bundle_sets_theme_and_assignments(self):
        import io
        bundle = io.BytesIO(b'{"theme_labels": ["A", "B", "C", "D", "E", "F"], "card_labels": {"5": [1, 4], "7": [3]}}')
        with self.client as client:
            response = client.post('/card-labels/import', data={'bundle_file': (bundle, 'labels.json')}, content_type='multipart/form-data')
            self.assertEqual(response.status_code, 302)
            with client.session_transaction() as session_data:
                self.assertEqual(session_data['theme_labels'][0], 'A')
                self.assertEqual(session_data['card_labels']['5'], [1, 4])


if __name__ == '__main__':
    unittest.main()
