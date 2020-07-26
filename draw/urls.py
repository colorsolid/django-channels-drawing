from django.urls import path, re_path
from . import views


urlpatterns = [
    path('', views.draw, name='lobby'),
    re_path(r'^room/(?P<room_name>[\w\d]+)/?', views.room, name='room'),
    re_path(r'^artist/(?P<hash>[\w\d]+)/?', views.profile, name='profile'),
    re_path(r'^.*', views.redirect_view, name='redirect')
]
