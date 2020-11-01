from django.urls import path, re_path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    re_path(r'^3d(print(er)?)?\/?$', views.printer, name='printer'),
    re_path(r'^pass_chat/(?P<room_name>[\w\d_]+)\/?$', views.pass_chat, name='redirect')
]
