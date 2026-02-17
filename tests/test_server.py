import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'Select_Cards'))
import server  # noqa: E402


class ServerRoutesTestCase(unittest.TestCase):
    def setUp(self):
        server.app.config['TESTING'] = True
        self.client = server.app.test_client()

    def test_finalize_accepts_valid_cards(self):
        response = self.client.post('/finalize', json={'selectedCards': ['1', '2', '3']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'success')

    def test_finalize_rejects_non_json_payload(self):
        response = self.client.post('/finalize', data='not-json', content_type='text/plain')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['status'], 'error')

    def test_finalize_rejects_out_of_range_ids(self):
        response = self.client.post('/finalize', json={'selectedCards': [103]})
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


if __name__ == '__main__':
    unittest.main()
