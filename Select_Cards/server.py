from flask import Flask, render_template, request
from flask_wtf.csrf import CSRFProtect
from wtforms import BooleanField, SubmitField, FieldList, FormField
from wtforms.validators import InputRequired
import cards  # assuming cards.py is in the same directory

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # needed for WTForms
csrf = CSRFProtect(app)

def print_form_data(form):
    """Helper function to print form data."""
    for field in form:
        if isinstance(field, FieldList):
            for subfield in field:
                print(f"{subfield.name}: {subfield.selected.data}")
        else:
            print(f"{field.name}: {field.data}")

@app.route('/', methods=['GET', 'POST'])
def index():
    form = cards.EmotionForm()
    all_emotions = cards.emotions.copy()  # Initialize copy to pass to the template

    if request.method == 'GET':
        print("GET")
        # Populate the FieldList with entries for each emotion
        for i, emotion in enumerate(cards.emotions):
            form.emotions.append_entry()
        # Correct the names after appending
        for i, field in enumerate(form.emotions):
            field.selected.name = f'emotions-{i}-selected'
        print_form_data(form)

    elif request.method == 'POST':
        print("POST")
        form = cards.EmotionForm(request.form)
        print_form_data(form)
        # Ensure the FieldList has the same number of entries as the emotions list
        while len(form.emotions) < len(cards.emotions):
            form.emotions.append_entry()
        # Correct the names after appending
        for i, field in enumerate(form.emotions):
            field.selected.name = f'emotions-{i}-selected'

        if form.validate_on_submit():
            # Update the selected state of each emotion based on form submission
            for i, emotion in enumerate(cards.emotions):
                all_emotions[i]['selected'] = form.emotions[i].selected.data
        else:
            print("Form validation failed")
            print(form.errors)

        print_form_data(form)

    return render_template('index.html', form=form, emotions=all_emotions)

if __name__ == '__main__':
    app.run(debug=True)
