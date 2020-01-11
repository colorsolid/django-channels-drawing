from django.http import HttpResponse
from django.shortcuts import render


def index(request):
    context = {}
    return render(request, 'home/home.html', context)


def read_file(request):
    infile = open('.well-known/pki-validation/7E37FB7C8B4C492373BAD765AF26CC27.txt', 'r')
    content = infile.read()
    infile.close()
    return HttpResponse(content, content_type='text/plain')

