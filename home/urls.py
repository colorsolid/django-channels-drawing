from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('.well-known/pki-validation/7E37FB7C8B4C492373BAD765AF26CC27.txt', views.read_file)
]
