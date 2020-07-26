from    channels.generic.websocket import AsyncWebsocketConsumer
import  channels.layers
from    decouple import config
from    django.contrib.sessions.backends.db import SessionStore
from    foli.settings import env
from    foli.utils import random_string
import  json
import  os
import  string


class PrinterConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.connection_id = random_string()
        if not hasattr(self.channel_layer, 'printer_viewers'):
            self.channel_layer.printer_viewers = []
        if not hasattr(self.channel_layer, 'print_data'):
            self.channel_layer.print_data = {}
        self.channel_layer.printer_viewers.append(self.connection_id)
        await self.accept()
        self.room_group_name = '3dprinter'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.update_user_count()
        await self.send(text_data=json.dumps(self.channel_layer.print_data))


    async def disconnect(self, close_code):
        if self.connection_id in self.channel_layer.printer_viewers:
            self.channel_layer.printer_viewers.remove(self.connection_id)
        await self.update_user_count()
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        if 'printer_socket_key' in data:
            data['type'] = 'relay'
            if data['printer_socket_key'] == env('PRINTER_SOCKET_KEY'):
                self.channel_layer.print_data.update(data['data'])
                await self.channel_layer.group_send(
                    '3dprinter',
                    data
                )


    async def relay(self, data):
        await self.send(text_data=json.dumps(data['data']))


    async def update_user_count(self):
        msg = {
            'data': {
                'connections': len(self.channel_layer.printer_viewers)
            },
            'type': 'relay'
        }
        await self.channel_layer.group_send(
            '3dprinter',
            msg
        )
