from flask import Flask, render_template, request, jsonify, session
from waitress import serve
import logging
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')

MIN_CARD_ID = 1
MAX_CARD_ID = 112
MAX_SELECTED_CARDS = 6


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


def get_validated_session_cards():
    selected_cards = session.get('selected_cards', [])
    validated_cards, error = parse_selected_cards(selected_cards)
    if error:
        return []
    return [int(card_id) for card_id in validated_cards]



@app.route('/')
def landing_page():
    return render_template('landing.html', username=session.get('username'))


@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '').strip()
    if username:
        session['username'] = username
    else:
        session.pop('username', None)
    return render_template('landing.html', username=session.get('username'))


@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return render_template('landing.html', username=None)


@app.route('/select-cards')
@app.route('/select_card')
def select_cards():
    images = [
        {'id': i, 'small': f'Images/cards/cards_s{i:03d}.png', 'large': f'Images/cards/cards_l{i:03d}.png'}
        for i in range(MIN_CARD_ID, MAX_CARD_ID + 1)
    ]
    return render_template('select_cards.html', images=images)


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

    session['selected_cards'] = validated_cards
    app.logger.debug('Selected cards: %s', validated_cards)
    return jsonify(status='success')



@app.route('/overview_cards')
def overview_cards():
    selected_cards = get_validated_session_cards()
    images = [
        {'id': card_id, 'large': f'Images/cards/cards_l{card_id:03d}.png'}
        for card_id in selected_cards
    ]
    return render_template('overview_cards.html', images=images)


if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=8000)
