from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.utils.safestring import mark_safe
import json


def index(request):
    context = {}
    return render(request, 'draw/lobby.html', context)


def room(request, room_name):
    print('request', request.__dict__, '\n')
    return render(request, 'draw/draw.html', {
        'room_name_json': mark_safe(json.dumps(room_name))
    })
