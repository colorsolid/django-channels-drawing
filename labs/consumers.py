import channels.layers
import json
import os
import string

from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
from decouple import config
from django.contrib.sessions.backends.db import SessionStore
from foli.settings import env
from foli.utils import random_string


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
        if hasattr(self.channel_layer, 'printer_connection_id'):
            if self.connection_id == self.channel_layer.printer_connection_id:
                self.channel_layer.print_data = {}
                await self.channel_layer.group_send(
                    '3dprinter',
                    {
                        'type': 'relay',
                        'data': {
                            'message': 'printer-disconnected'
                        }
                    }
                )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        if 'printer_socket_key' in data:
            data['type'] = 'relay'
            if data['printer_socket_key'] == env('PRINTER_SOCKET_KEY'):
                self.channel_layer.printer_connection_id = self.connection_id
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


class PlexSyncConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id'].lower()
        self.set_connection_id()
        self.room_group_name = 'plex_sync_' + self.room_id
        await self.accept()
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.send(json.dumps({
            'note': 'init',
            'timestamp': datetime.utcnow().timestamp()
        }))


    def set_connection_id(self):
        self.connection_id = random_string()
        init_data = {'ready': False}
        if not hasattr(self.channel_layer, 'connections'):
            self.channel_layer.connections = {
                self.connection_id: init_data
            }
        else:
            while self.connection_id in self.channel_layer.connections:
                self.connection_id = random_string()
            self.channel_layer.connections[self.connection_id] = init_data


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        if 'type' in data and data['type'] == 'relay':
            timestamp = datetime.utcnow().timestamp()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'timestamp': timestamp,
                    'action': data['action'],
                    'type': 'relay'
                }
            )


    async def relay(self, data):
        await self.send(text_data=json.dumps(data))


class PassChat(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id'].lower()
        self.set_connection_id()
        self.room_group_name = 'pass_chat_' + self.room_id
        await self.accept()
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )


    def set_connection_id(self):
        self.connection_id = random_string()
        init_data = {}
        if not hasattr(self.channel_layer, 'connections'):
            self.channel_layer.connections = {
                self.connection_id: init_data
            }
        else:
            while self.connection_id in self.channel_layer.connections:
                self.connection_id = random_string()
            self.channel_layer.connections[self.connection_id] = init_data


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        if 'type' in data and data['type'] == 'relay':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'message': data['message'],
                    'type': 'relay'
                }
            )


    async def relay(self, data):
        await self.send(text_data=json.dumps(data))
