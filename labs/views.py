import json
import os

from decouple import config
from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import render, redirect
from foli.utils import env
from .utils import get_random_colors


def index(request):
    context = {'root': env('ROOT')}
    return render(request, 'labs/home.html', context)


def printer(request, *args):
    context = {'root': env('ROOT')}
    return render(request, 'labs/printer.html', context)


def pass_chat(request, room_name):
    context = {'room_id': room_name, 'root': env('ROOT')}
    return render(request, 'labs/pass_chat.html', context)


def redirect_view(request):
    response = redirect('/3d/')
    return response
