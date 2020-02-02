from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import render


def index(request):
    context = {}
    return render(request, 'labs/home.html', context)


def email(request):
    send_mail(
        'Subject here',
        'Here is the message.',
        'admin@skyray.dev',
        ['colorsolid@gmail.com'],
        fail_silently=False,
    )
    return HttpResponse('Yo', content_type='text/plain')
