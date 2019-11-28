from    django import forms
from    django.utils.translation import gettext_lazy as _
from    .models import DrawingBoard, Artist


class DrawingBoardForm(forms.ModelForm):
    class Meta:
        model = DrawingBoard
        fields = ['name']
        labels = {
            'name': _('room name'),
        }
        help_texts = {
            'name': _('choose a name for the drawing room.'),
        }
        error_messages = {
            'name': {
                'max_length': _('room name is too long.')
            }
        }

    def clean(self):
        super(DrawingBoardForm, self).clean()
        name = self.cleaned_data.get('name')
        if len(username) < 5:
            self._errors['username'] = self.error_class([
                'Minimum 5 characters required'])
        if len(text) <10:
            self._errors['text'] = self.error_class([
                'Post Should Contain minimum 10 characters'])
        return self.cleaned_data


class ArtistForm(forms.ModelForm):
    class Meta:
        model = Artist
        fields = ['nickname']
        labels = {
            'nickname': _('nickname'),
        }
        help_texts = {
            'nickname': _('choose a nickname for yourself.'),
        }
        error_messages = {
            'nickname': {
                'max_length': _('nickname is too long.')
            }
        }
