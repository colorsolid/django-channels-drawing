from django.shortcuts import render


def index(request):
    context = {}
    return render(request, 'labs/home.html', context)
