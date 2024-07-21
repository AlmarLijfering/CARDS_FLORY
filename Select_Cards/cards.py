from flask_wtf import FlaskForm
from wtforms import BooleanField, SubmitField, FieldList, FormField
from wtforms.validators import InputRequired

emotions = [
    {'emotion': 'Angry'},
    {'emotion': 'Contentment'},
    {'emotion': 'Disgusted'},
    {'emotion': 'Envy'},
    {'emotion': 'Guilt'},
    {'emotion': 'Happy'},
    {'emotion': 'Jealousy'},
    {'emotion': 'Love'},
    {'emotion': 'Pride'},
    {'emotion': 'Relief'},
    {'emotion': 'Sad'},
    {'emotion': 'Scared'},
    {'emotion': 'Shame'},
    {'emotion': 'Surprised'}
]

class EmotionCheckboxForm(FlaskForm):
    selected = BooleanField('')  # Set the label to an empty string

class EmotionForm(FlaskForm):
    emotions = FieldList(FormField(EmotionCheckboxForm), min_entries=3)
    csrf_token = BooleanField(validators=[InputRequired()])
    submit = SubmitField('Submit')
