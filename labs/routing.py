from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/3d/$', consumers.PrinterConsumer),
    re_path(r'ws/plex_sync/(?P<room_id>\w+)\/?$', consumers.PlexSyncConsumer),
    re_path(r'ws/pass_chat/(?P<room_id>\w+)\/?$', consumers.PassChat)
]
