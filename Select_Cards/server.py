import json
import logging
import os
import secrets
import sqlite3
import sys
import tempfile
from pathlib import Path

from flask import Flask, Response, g, jsonify, redirect, render_template, request, url_for
from waitress import serve


logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')

default_db_dir = Path(tempfile.gettempdir())
app.config['STATE_DB_PATH'] = os.environ.get('STATE_DB_PATH', str(default_db_dir / 'cards_state.sqlite3'))

MIN_CARD_ID = 1
MAX_CARD_ID = 112
MAX_SELECTED_CARDS = 6
THEME_SLOT_COUNT = 6
SUPPORTED_LANGUAGES = {'en', 'nl', 'ro'}
STATE_COOKIE_NAME = 'cards_session_id'
STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30


def get_default_theme_labels():
    return [f'Label {index}' for index in range(1, THEME_SLOT_COUNT + 1)]


def get_default_state():
    return {
        'username': None,
        'selected_cards': [],
        'theme_labels': get_default_theme_labels(),
        'card_labels': {},
        'language': 'en',
    }


def get_db():
    if 'state_db' not in g:
        connection = sqlite3.connect(app.config['STATE_DB_PATH'])
        connection.row_factory = sqlite3.Row
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS app_sessions (
                session_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        connection.commit()
        g.state_db = connection
    return g.state_db


@app.teardown_appcontext
def close_db(_exception):
    connection = g.pop('state_db', None)
    if connection is not None:
        connection.close()


def normalize_state(raw_state):
    state = get_default_state()
    if not isinstance(raw_state, dict):
        return state

    username = raw_state.get('username')
    state['username'] = username.strip() if isinstance(username, str) and username.strip() else None

    selected_cards = raw_state.get('selected_cards')
    validated_cards, _ = parse_selected_cards(selected_cards) if isinstance(selected_cards, list) else ([], None)
    state['selected_cards'] = validated_cards or []

    theme_labels = raw_state.get('theme_labels')
    if isinstance(theme_labels, list) and len(theme_labels) == THEME_SLOT_COUNT:
        normalized_theme_labels = []
        for index, value in enumerate(theme_labels, start=1):
            text = value.strip() if isinstance(value, str) else ''
            normalized_theme_labels.append(text or f'Label {index}')
        state['theme_labels'] = normalized_theme_labels

    card_labels = raw_state.get('card_labels')
    if isinstance(card_labels, dict):
        state['card_labels'] = normalize_card_labels(card_labels)

    language = raw_state.get('language')
    if isinstance(language, str) and language in SUPPORTED_LANGUAGES:
        state['language'] = language

    return state


def load_state(session_id):
    row = get_db().execute(
        'SELECT payload FROM app_sessions WHERE session_id = ?',
        (session_id,),
    ).fetchone()
    if not row:
        return get_default_state()

    try:
        payload = json.loads(row['payload'])
    except json.JSONDecodeError:
        app.logger.warning('Invalid state payload for session %s; resetting state', session_id)
        return get_default_state()

    return normalize_state(payload)


def save_state():
    db = get_db()
    payload = json.dumps(g.app_state, separators=(',', ':'))
    db.execute(
        '''
        INSERT INTO app_sessions (session_id, payload, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(session_id)
        DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
        ''',
        (g.session_id, payload),
    )
    db.commit()


@app.before_request
def load_request_state():
    session_id = request.cookies.get(STATE_COOKIE_NAME)
    if not session_id:
        session_id = secrets.token_urlsafe(24)
        g.new_session_id = session_id
    g.session_id = session_id
    g.app_state = load_state(session_id)
    g.state_dirty = False


@app.after_request
def persist_request_state(response):
    if getattr(g, 'state_dirty', False):
        save_state()

    if getattr(g, 'new_session_id', None):
        response.set_cookie(
            STATE_COOKIE_NAME,
            g.new_session_id,
            max_age=STATE_COOKIE_MAX_AGE,
            httponly=True,
            samesite='Lax',
            secure=not app.debug,
        )

    return response


def mark_state_dirty():
    g.state_dirty = True


def get_state():
    return g.app_state


def parse_selected_cards(payload):
    """Validate selected cards payload and return normalized list of card ids as strings."""
    if not isinstance(payload, list):
        return None, 'selectedCards must be a list'

    if not payload:
        return None, 'No selected cards provided'

    if len(payload) > MAX_SELECTED_CARDS:
        return None, f'A maximum of {MAX_SELECTED_CARDS} cards may be selected'

    normalized = []
    seen = set()
    for card_id in payload:
        if isinstance(card_id, bool):
            return None, f'Invalid card id: {card_id}'

        try:
            parsed = int(card_id)
        except (TypeError, ValueError):
            return None, f'Invalid card id: {card_id}'

        if parsed < MIN_CARD_ID or parsed > MAX_CARD_ID:
            return None, f'Card id must be between {MIN_CARD_ID} and {MAX_CARD_ID}'

        if parsed in seen:
            return None, 'Duplicate card ids are not allowed'

        seen.add(parsed)
        normalized.append(str(parsed))

    return normalized, None


def normalize_card_labels(raw_assignments):
    validated = {}
    if not isinstance(raw_assignments, dict):
        return validated

    for raw_card_id, raw_labels in raw_assignments.items():
        try:
            card_id = int(raw_card_id)
        except (TypeError, ValueError):
            continue

        if card_id < MIN_CARD_ID or card_id > MAX_CARD_ID:
            continue

        if not isinstance(raw_labels, list):
            continue

        unique_labels = []
        seen = set()
        for raw_label in raw_labels:
            try:
                label_id = int(raw_label)
            except (TypeError, ValueError):
                continue

            if label_id < 1 or label_id > THEME_SLOT_COUNT or label_id in seen:
                continue

            seen.add(label_id)
            unique_labels.append(label_id)

        if unique_labels:
            validated[str(card_id)] = unique_labels

    return validated


def get_validated_session_cards(state=None):
    current_state = state or get_state()
    validated_cards, error = parse_selected_cards(current_state.get('selected_cards', []))
    if error:
        return []
    return [int(card_id) for card_id in validated_cards]


def get_theme_labels(state=None):
    current_state = state or get_state()
    theme_labels = current_state.get('theme_labels')
    if isinstance(theme_labels, list) and len(theme_labels) == THEME_SLOT_COUNT:
        normalized = []
        for index, value in enumerate(theme_labels, start=1):
            text = value.strip() if isinstance(value, str) else ''
            normalized.append(text or f'Label {index}')
        return normalized
    return get_default_theme_labels()


def get_validated_card_labels(state=None):
    current_state = state or get_state()
    return normalize_card_labels(current_state.get('card_labels'))


def get_validated_language(state=None):
    current_state = state or get_state()
    stored = current_state.get('language')
    if isinstance(stored, str) and stored in SUPPORTED_LANGUAGES:
        return stored
    return 'en'


def parse_language(payload):
    if not isinstance(payload, str):
        return None
    normalized = payload.strip().lower()
    if normalized in SUPPORTED_LANGUAGES:
        return normalized
    return None


def normalize_import_payload(data):
    if not isinstance(data, dict):
        return None, 'Import payload must be a JSON object'

    raw_theme_labels = data.get('theme_labels')
    if not isinstance(raw_theme_labels, list) or len(raw_theme_labels) != THEME_SLOT_COUNT:
        return None, f'theme_labels must be a list with {THEME_SLOT_COUNT} entries'

    normalized_theme_labels = []
    for index, value in enumerate(raw_theme_labels, start=1):
        text = value.strip() if isinstance(value, str) else ''
        normalized_theme_labels.append(text or f'Label {index}')

    raw_assignments = data.get('card_labels')
    if not isinstance(raw_assignments, dict):
        return None, 'card_labels must be an object of card-to-label assignments'

    return {
        'theme_labels': normalized_theme_labels,
        'card_labels': normalize_card_labels(raw_assignments),
    }, None


@app.route('/')
def landing_page():
    return render_template('landing.html', username=get_state().get('username'))


@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '').strip()
    state = get_state()
    state['username'] = username or None
    mark_state_dirty()
    return render_template('landing.html', username=state['username'])


@app.route('/logout', methods=['POST'])
def logout():
    state = get_state()
    state['username'] = None
    mark_state_dirty()
    return render_template('landing.html', username=None)


@app.route('/select-cards')
@app.route('/select_card')
def select_cards():
    theme_labels = get_theme_labels()
    card_assignments = get_validated_card_labels()
    images = [
        {
            'id': i,
            'small': f'Images/cards/cards_s{i:03d}.png',
            'large': f'Images/cards/cards_l{i:03d}.png',
            'label_ids': card_assignments.get(str(i), []),
        }
        for i in range(MIN_CARD_ID, MAX_CARD_ID + 1)
    ]
    return render_template(
        'select_cards.html',
        images=images,
        theme_labels=theme_labels,
        current_language=get_validated_language(),
    )


@app.route('/themes', methods=['GET', 'POST'])
def themes_page():
    state = get_state()
    if request.method == 'POST':
        labels = []
        for index in range(1, THEME_SLOT_COUNT + 1):
            field = f'label_{index}'
            labels.append(request.form.get(field, '').strip() or f'Label {index}')
        state['theme_labels'] = labels
        mark_state_dirty()
        return redirect(url_for('themes_page', saved='1'))

    return render_template(
        'themes.html',
        labels=get_theme_labels(state),
        saved=request.args.get('saved') == '1'
    )


@app.route('/card-labels', methods=['GET', 'POST'])
def card_labels_page():
    state = get_state()
    if request.method == 'POST':
        stored_assignments = {}
        for card_id in range(MIN_CARD_ID, MAX_CARD_ID + 1):
            selected_labels = request.form.getlist(f'card_{card_id}_labels')
            unique_labels = []
            seen = set()

            for raw_label in selected_labels:
                try:
                    label_id = int(raw_label)
                except (TypeError, ValueError):
                    continue

                if label_id < 1 or label_id > THEME_SLOT_COUNT or label_id in seen:
                    continue

                seen.add(label_id)
                unique_labels.append(label_id)

            if unique_labels:
                stored_assignments[str(card_id)] = unique_labels

        state['card_labels'] = stored_assignments
        mark_state_dirty()
        return redirect(url_for('card_labels_page', saved='1'))

    theme_labels = get_theme_labels(state)
    card_assignments = get_validated_card_labels(state)
    cards = []
    for card_id in range(MIN_CARD_ID, MAX_CARD_ID + 1):
        assigned_labels = card_assignments.get(str(card_id), [])
        cards.append({
            'id': card_id,
            'small': f'Images/cards/cards_s{card_id:03d}.png',
            'assigned_labels': assigned_labels,
            'search_text': f'{card_id} ' + ' '.join(theme_labels[label_id - 1].lower() for label_id in assigned_labels),
        })

    return render_template(
        'card_labels.html',
        cards=cards,
        theme_labels=theme_labels,
        saved=request.args.get('saved') == '1'
    )


@app.route('/card-labels/export', methods=['GET'])
def export_card_labels():
    payload = {
        'theme_labels': get_theme_labels(),
        'card_labels': get_validated_card_labels(),
    }
    return Response(
        json.dumps(payload, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=card_labels_bundle.json'},
    )


@app.route('/card-labels/import', methods=['POST'])
def import_card_labels():
    uploaded = request.files.get('bundle_file')
    if not uploaded:
        return redirect(url_for('card_labels_page', import_error='missing_file'))

    try:
        payload = json.loads(uploaded.read().decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return redirect(url_for('card_labels_page', import_error='invalid_json'))

    normalized_payload, error = normalize_import_payload(payload)
    if error:
        return redirect(url_for('card_labels_page', import_error=error))

    state = get_state()
    state['theme_labels'] = normalized_payload['theme_labels']
    state['card_labels'] = normalized_payload['card_labels']
    mark_state_dirty()
    return redirect(url_for('card_labels_page', imported='1'))


@app.route('/log', methods=['POST'])
def log():
    data = request.get_json(silent=True) or {}
    message = data.get('message')
    if isinstance(message, str) and message.strip():
        app.logger.debug(message.strip())
        return jsonify(status='success')
    return jsonify(status='error', message='No message provided'), 400


@app.route('/finalize', methods=['POST'])
def finalize():
    data = request.get_json(silent=True) or {}
    selected_cards = data.get('selectedCards')
    validated_cards, error = parse_selected_cards(selected_cards)

    if error:
        return jsonify(status='error', message=error), 400

    state = get_state()
    state['selected_cards'] = validated_cards
    chosen_language = parse_language(data.get('language'))
    if chosen_language:
        state['language'] = chosen_language
    mark_state_dirty()
    app.logger.debug('Selected cards: %s', validated_cards)
    return jsonify(status='success')


@app.route('/set-language', methods=['POST'])
def set_language():
    data = request.get_json(silent=True) or {}
    chosen_language = parse_language(data.get('language'))
    if not chosen_language:
        return jsonify(status='error', message='Invalid language'), 400

    state = get_state()
    state['language'] = chosen_language
    mark_state_dirty()
    return jsonify(status='success')


@app.route('/overview_cards')
def overview_cards():
    selected_cards = get_validated_session_cards()
    images = [
        {'id': card_id, 'large': f'Images/cards/cards_l{card_id:03d}.png'}
        for card_id in selected_cards
    ]
    return render_template(
        'overview_cards.html',
        images=images,
        current_language=get_validated_language(),
    )


if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=8000)
