from    django.http import HttpResponseRedirect
from    django.shortcuts import render, redirect
from    django.utils.safestring import mark_safe
from    django.utils.text import slugify
from    foli.utils import random_string, random_phrase
import  json
import  re

from    .forms import DrawingBoardForm, ArtistForm
from    .models import DrawingBoard, DrawingBoardGroup, Artist, Drawing, Segment



def draw(request):
    if request.method == 'POST':
        return start_drawing(request)
    else:
        return lobby(request)


def lobby(request):
    room_name = request.session.get('last_room_name', random_phrase('noun'))
    nickname = request.session.get('nickname')
    context, user_id, nickname = get_context(request)
    drawing_board_form = DrawingBoardForm(initial={'name': room_name})
    artist_form = ArtistForm(initial={'nickname': nickname})
    context = {
        'user_id': mark_safe(user_id),
        'nickname':  mark_safe(nickname),
        'name':  mark_safe(room_name),
        'random_choices': mark_safe(json.dumps([
            [random_phrase('adj', 'noun') for _ in range(100)],
            [random_phrase('noun') for _ in range(100)]
        ])),
        'drawing_board_form': drawing_board_form,
        'artist_form': artist_form,
        'forms': [drawing_board_form, artist_form]
    }
    return render(request, 'draw/lobby.html', context)


def start_drawing(request):
    room_name = slugify(request._post['name'])
    nickname = slugify(request._post['nickname'])
    request.session['last_room_name'] = room_name
    request.session['nickname'] = nickname
    id = request.session.get('user_id', random_string())
    artist = try_artist(id, nickname)
    board = try_board(room_name, artist)
    drawing, created = Drawing.objects.get_or_create(artist=artist, board=board)
    print(drawing)
    return redirect(f'/draw/{room_name}')


def room(request, room_name):
    context, user_id, nickname = get_context(request)
    artist = try_artist(user_id, nickname)
    board = try_board(room_name, artist)
    context['room_name'] = mark_safe(room_name)
    return render(request, 'draw/draw.html', context)


def get_context(request):
    nickname = request.session.get('nickname')
    if not nickname:
        nickname = random_phrase('adj', 'noun')
        request.session['nickname'] = nickname
    user_id = request.session.get('user_id')
    if not user_id or user_id != user_id.lower():
        user_id = random_string()
        request.session['user_id'] = user_id
    context = {
        'user_id': mark_safe(user_id),
        'nickname':  mark_safe(nickname)
    }
    return context, user_id, nickname


def try_artist(id, nickname):
    try:
        artist = Artist.objects.get(user_id=id)
        if artist.nickname != nickname:
            artist.nickname = nickname
            artist.save()
    except Artist.DoesNotExist:
        artist = Artist.objects.create(user_id=id, nickname=nickname)
    return artist


def try_board(room_name, artist):
    try:
        board = DrawingBoard.objects.get(name=room_name)
    except DrawingBoard.DoesNotExist:
        board = DrawingBoard.objects.create(name=room_name, creator=artist)
        group = DrawingBoardGroup.objects.create(board=board)
    return board
