from    django.http import HttpResponseRedirect
from    django.shortcuts import render, redirect
from    django.utils.safestring import mark_safe
from    django.utils.text import slugify
from    foli.utils import random_string, random_phrase
import  json
import  re

from    .forms import DrawingBoardForm, ArtistForm
from    .models import Artist


def draw(request):
    if request.method == 'POST':
        return start_drawing(request)
    else:
        return lobby(request)


def lobby(request):
    room_name = request.session.get('last_room_name', random_phrase('noun'))
    context = get_context(request)
    drawing_board_form = DrawingBoardForm(initial={'name': room_name})
    artist_form = ArtistForm(initial={'nickname': context['nickname']})
    context.update({
        'name':  mark_safe(room_name),
        'random_choices': mark_safe(json.dumps([
            [random_phrase('adj', 'noun') for _ in range(100)],
            [random_phrase('noun') for _ in range(100)]
        ])),
        'drawing_board_form': drawing_board_form,
        'artist_form': artist_form,
        'forms': [drawing_board_form, artist_form]
    })
    return render(request, 'draw/lobby.html', context)


def start_drawing(request):
    room_name = slugify(request._post['name'])
    nickname = slugify(request._post['nickname'])
    request.session['last_room_name'] = room_name
    request.session['nickname'] = nickname
    return redirect(f'/draw/{room_name}')


def room(request, room_name):
    context = get_context(request)
    context['room_name'] = mark_safe(room_name)
    return render(request, 'draw/draw.html', context)


def get_context(request):
    nickname = request.session.get('nickname')
    if not nickname:
        nickname = random_phrase('adj', 'noun')
        request.session['nickname'] = nickname
    user_id = request.session.get('user_id')
    if not user_id or user_id != user_id.lower():
        while True: # in the impossible event that the same id is generated twice (1 / 1.33675e+31)
            user_id = random_string()
            try:
                artist = Artist.objects.get(user_id=user_id)
            except Artist.DoesNotExist:
                break
        request.session['user_id'] = user_id
    context = {
        'user_id': mark_safe(user_id),
        'nickname':  mark_safe(nickname)
    }
    return context
