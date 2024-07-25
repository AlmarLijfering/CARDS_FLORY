from flask import Flask, render_template, request, jsonify
from waitress import serve
import os
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler(sys.stdout)])

app = Flask(__name__)

selected_cards = []

@app.route('/')
def index():
#    for root, dirs, files in os.walk(os.getcwd()):
#        logging.debug(f"Directory: {root}")
#        for dir in dirs:
#            logging.debug(f"Sub-directory: {dir}")
#        for file in files:
#            logging.debug(f"File: {file}")

    images = [
        {"id": i, "small": f"Images/cards/cards_s{i:03d}.jpg", "large": f"Images/cards/cards_l{i:03d}.jpg"}
        for i in range(1, 109)
    ]
    return render_template('select_cards.html', images=images)

@app.route('/log', methods=['POST'])
def log():
    message = request.json.get('message')
    if message:
        app.logger.debug(message)
        return jsonify(status='success')
    else:
        return jsonify(status='error', message='No message provided'), 400

@app.route('/finalize', methods=['POST'])
def finalize():
    global selected_cards
    selected_cards = request.json.get('selectedCards', [])
    if selected_cards:
        app.logger.debug(f"Selected cards: {selected_cards}")
        return jsonify(status='success')
    else:
        return jsonify(status='error', message='No selected cards provided'), 400

@app.route('/overview_cards')
def overview_cards():
    images = [
        {"id": i, "large": f"Images/cards/cards_l{i:03d}.jpg"}
        for i in map(int, selected_cards)
    ]
    return render_template('overview_cards.html', images=images)

if __name__ == '__main__':
    serve(app, host="0.0.0.0", port=8000)
