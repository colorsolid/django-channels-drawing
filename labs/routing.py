from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/3d/$', consumers.PrinterConsumer)
]
