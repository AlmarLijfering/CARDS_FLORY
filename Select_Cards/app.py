from flask import Flask, render_template, request, jsonify
from waitress import serve


app = Flask(__name__)

selected_cards = []

@app.route('/')
def index():
    images = [
        {"id": i, "small": f"Images/cards/cards_s{i:03d}.jpg", "large": f"Images/cards/cards_l{i:03d}.jpg"}
        for i in range(1, 109)
    ]
    return render_template('select_cards.html', images=images)

@app.route('/log', methods=['POST'])
def log():
    message = request.json.get('message')
    app.logger.debug(message)
    return jsonify(status='success')

@app.route('/finalize', methods=['POST'])
def finalize():
    global selected_cards
    selected_cards = request.json.get('selectedCards', [])
    return jsonify(status='success')

@app.route('/overview_cards')
def overview_cards():
    images = [
        {"id": i, "large": f"Images/cards/cards_l{i:03d}.jpg"}
        for i in map(int, selected_cards)
    ]
    return render_template('overview_cards.html', images=images)

if __name__ == '__main__':
    serve(app, host="0.0.0.0", port=8000)
