from    datetime import datetime
from    django.http import HttpResponseRedirect
from    django.shortcuts import render, redirect
from    django.utils.safestring import mark_safe
from    django.utils.text import slugify
from    django.utils import timezone
from    draw.utils import get_context
from    foli.utils import random_string, random_phrase
import  json
import  re

from    .forms import DrawingBoardForm, ArtistForm
from    .models import Artist, DrawingBoard


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
        'forms': [drawing_board_form, artist_form],
        'rooms': []
    })
    rooms = DrawingBoard.objects.all().order_by('date_modified').reverse()[:10]
    for room in rooms:
        context['rooms'].append({
            'room_name': room.name,
            'creator_nickname': room.creator.nickname,
            'creator_hash': room.creator.user_id[0:12]
        })
    return render(request, 'draw/lobby.html', context)


def start_drawing(request):
    room_name = slugify(request._post['name'])
    nickname = slugify(request._post['nickname'])
    request.session['nickname'] = nickname
    return redirect(f'/draw/{room_name}')


def room(request, room_name):
    context = get_context(request)
    context['room_name'] = mark_safe(room_name)
    request.session['last_room_name'] = room_name
    print(context)
    return render(request, 'draw/draw.html', context)
