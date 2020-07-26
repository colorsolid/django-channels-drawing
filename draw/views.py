from datetime import datetime
from django.contrib.auth.models import User
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Count
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render, redirect
from django.utils.safestring import mark_safe
from django.utils.text import slugify
from django.utils import timezone
from draw.utils import get_context
from foli.utils import random_string, random_phrase
from labs.utils import get_random_colors

from .forms import DrawingBoardSearchForm, ArtistForm
from .models import Artist, DrawingBoard

import json
import re


def lobby(request, context={}):
    room_name = request.session.get('last_room_name', random_phrase('noun'))
    context = get_context(request, context)
    artist_form = ArtistForm(initial={'nickname': context['nickname']})
    drawing_board_form = DrawingBoardSearchForm(initial={'search_name': room_name})
    context.update({
        'name':  mark_safe(room_name),
        'random_choices': mark_safe(json.dumps([
            [random_phrase('adj', 'noun') for _ in range(100)],
            [random_phrase('noun') for _ in range(100)]
        ])),
        'rooms': []
    })
    if 'forms' not in context:
        context['forms'] = [artist_form, drawing_board_form]
    sort_by = request.GET.get('sortby')
    if sort_by == 'newest':
        room_list = DrawingBoard.objects.all().order_by('date_created').reverse()
    else:
        sort_by = 'popular'
        room_list = DrawingBoard.objects.all() \
            .annotate(count=Count('drawing__segment')) \
            .order_by('count').reverse()

    page = request.GET.get('page', 1)

    paginator = Paginator(room_list, 10)
    try:
        num = int(page)
        rooms = paginator.page(num)
    except (ValueError, PageNotAnInteger):
        num = 1
        rooms = paginator.page(num)
    except EmptyPage:
        num = paginator.num_pages
        rooms = paginator.page(num)
    context['rooms'] = rooms
    context['sort_by'] = sort_by
    context['room_num_offset'] = (num - 1) * 10
    return render(request, 'draw/lobby.html', context)


def draw(request):
    context = {}
    if request.method == 'POST' and request.body:
        if 'nickname' in request.POST and 'name' in request.POST:
            nickname = request.POST['nickname']
            room_name = request.POST['name']
            artist_form = ArtistForm(request.POST, initial={'nickname': nickname})
            drawing_board_form = DrawingBoardSearchForm(request.POST, initial={'search_name': room_name})
            context['forms'] = [artist_form, drawing_board_form]
            request.session['nickname'] = request.POST['nickname']
            if artist_form.is_valid() and drawing_board_form.is_valid():
                return start_drawing(request)
        else:
            response = handle_data_request(request)
            if response:
                return response
    return lobby(request, context)


def handle_data_request(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        if 'type' in data:
            if data['type'] == 'get_room_details':
                response_data = {'type': 'room_details'}
                try:
                    board = DrawingBoard.objects.get(name=data['room_name'])
                    response_data['nickname'] = board.creator.nickname,
                    response_data['hash'] = board.creator.user_id[0:12]
                except DrawingBoard.DoesNotExist:
                    pass
            if data['type'] == 'join_room':
                room_name = slugify(data['room_name'])
                nickname = slugify(data['nickname'])
                request.session['nickname'] = nickname
                return JsonResponse({'type': 'join'})
        return JsonResponse(response_data)
    except Exception as e:
        print(e)


def start_drawing(request):
    room_name = slugify(request._post['name'])
    nickname = slugify(request._post['nickname'])
    request.session['nickname'] = nickname
    return redirect(f'/draw/room/{room_name}')


def room(request, room_name):
    context = get_context(request)
    if room_name != slugify(room_name):
        return redirect(f'/draw/room/{slugify(room_name)}')
    else:
        context['room_name'] = mark_safe(room_name)
        request.session['last_room_name'] = room_name
        return render(request, 'draw/draw.html', context)


def email(request):
    if request.method == 'POST' and request.body:
        address = request.POST.get('address')
        send_mail(
            'draw login | bitfall.io',
            '<a href="google.com">test link</a>',
            'admin@bitfall.io',
            [address],
            fail_silently=False,
        )
    return render(request, 'labs/email_login.html', {})


def profile(request, hash):
    if hash != slugify(hash):
        return redirect(f'/draw/profile/{slugify(hash)}')
    else:
        try:
            artist = Artist.objects.get(user_id__startswith=hash)
        except Artist.DoesNotExist:
            artist = None
        context = {
            'hash': mark_safe(hash),
            'sublink': 'draw'
        }
        if artist:
            context['nickname'] = artist.nickname
            context['drawings'] = artist.boards
            if (artist.user_id == request.session.get('user_id')):
                context['self'] = True
        return render(request, 'draw/profile.html', context)


def redirect_view(request):
    return redirect('/draw/')
