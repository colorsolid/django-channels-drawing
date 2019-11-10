from django.urls import path, re_path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path(r'<str:room_name>/', views.room, name='room'),
]
