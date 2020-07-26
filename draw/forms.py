from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator, MaxLengthValidator, EmailValidator
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from .models import DrawingBoard, Artist


class ProfileForm(forms.ModelForm):
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
                'max_length': _('nickname is too long.'),
                'min_length': _('nickname is too short.')
            }
        }


class ArtistForm(forms.ModelForm):
    class Meta:
        model = Artist
        fields = ['nickname']
        labels = {
            'nickname': _('nickname'),
        }
        error_messages = {
            'nickname': {
                'max_length': _('nickname must be 30 characters or less')
            }
        }

    def clean_nickname(self):
        cleaned = super().clean()
        nickname = cleaned.get('nickname')
        if nickname != slugify(nickname):
            raise ValidationError('nickname must contain only letters, numbers, dashes, or underscores')
        return nickname


class DrawingBoardForm(forms.ModelForm):
    class Meta:
        model = DrawingBoard
        fields = ['name']
        labels = {
            'name': _('room name'),
        }
        error_messages = {
            'name': {
                'max_length': _('room name must be 30 characters or less'),
                'required': _('room name is required')
            }
        }

    def clean_name(self):
        cleaned = super().clean()
        room_name = cleaned.get('name')
        if room_name != slugify(room_name):
            raise ValidationError('room name must contain only letters, numbers, dashes, or underscores')
        return room_name


class DrawingBoardSearchForm(DrawingBoardForm):
    search_name = forms.CharField(label='room name', required=False)

    class Meta(DrawingBoardForm.Meta):
        fields = DrawingBoardForm.Meta.fields + ['search_name',]

        widgets = {'name': forms.HiddenInput()}
