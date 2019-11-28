from django.urls import path, re_path
from . import views


urlpatterns = [
    path('', views.draw, name='lobby'),
    path(r'<str:room_name>/', views.room, name='room')
]
