from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import render, redirect
import json
from .utils import get_random_colors


def index(request):
    context = {}
    return render(request, 'labs/home.html', context)


def printer(request):
    context = {}
    return render(request, 'labs/printer.html', context)


def redirect_view(request):
    response = redirect('/3d/')
    return response
