from    channels.generic.websocket import AsyncWebsocketConsumer
import  channels.layers
from    django.contrib.sessions.backends.db import SessionStore
import  json
import  os
import  random
import  string
from    foli.utils import random_string
from    .models import DrawingBoard, Artist


class DrawConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = None
        await self.gather_data()
        if self.room_name:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            await self.update_users()
            await self.send_data({'set_connection_id': self.connection_id})


    async def gather_data(self):
        if not hasattr(self.channel_layer, 'user_list'):
            self.channel_layer.user_list = {}
        room_name = self.scope['url_route']['kwargs']['room_name']
        self.connection_id = random_string()
        session = self.scope['session']
        self.user_id = session.get('user_id')
        self.hash = self.user_id[0:4]
        self.nickname = session.get('nickname')
        if not self.user_id or not self.nickname:
            await self.close()
        else:
            self.room_name = self.scope['url_route']['kwargs']['room_name'].lower()
            self.room_group_name = 'draw_' + self.room_name


    async def disconnect(self, close_code):
        if self.user_id and self.nickname:
            await self.update_users(new=False)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'save':
            await self.save(data)


    # message to client, called data['type'] in receive()
    async def draw(self, data):
        await self.send(text_data=json.dumps(data))


    async def send_data(self, data):
        d = {k:data[k] for k in data if k !='type'}
        await self.send(text_data=json.dumps(d))


    async def save(self, data):
        room_name = self.scope['url_route']['kwargs']['room_name']
        user_id = self.scope['session'].get('user_id')
        board = DrawingBoard.objects.get(name=room_name)
        artist = Artist.objects.get(user_id=user_id)
        


    async def update_users(self, new=True):
        if new:
            await self.add_user()
        else:
            await self.remove_user()


    async def add_user(self):
        if not self.room_name in self.channel_layer.user_list:
            self.channel_layer.user_list[self.room_name] = []
        user_list = self.channel_layer.user_list[self.room_name]
        user_list_serial = [{
            'nickname': u['nickname'],
            'hash': u['user_id'][0:4]
        } for u in user_list]
        await self.send_data({'note': 'load', 'list': user_list_serial})
        i, user = next(((i, u) for i, u in enumerate(user_list) if u['user_id'] == self.user_id), (None, None))
        channel_data = {}
        if user:
            if user['nickname'] != self.nickname:
                channel_data = {
                    'note': 'update',
                    'hash': self.hash,
                    'nickname': self.nickname,
                    'old_nickname': user['nickname'],
                    'type': 'send_data'
                }
                user_list[i]['nickname'] = self.nickname
            user_list[i]['connection_ids'].append(self.connection_id)
        else:
            user_data = {
                'nickname': self.nickname,
                'user_id': self.user_id,
                'connection_ids': [self.connection_id]
            }
            user_list.append(user_data)
            channel_data = {k:user_data[k] for k in user_data}
            channel_data.update({
                'note': 'connected',
                'connection_id': self.connection_id,
                'hash': self.hash,
                'type': 'send_data'
            })
            del channel_data['user_id']
        if channel_data:
            await self.channel_layer.group_send(
                self.room_group_name,
                channel_data
            )


    async def remove_user(self):
        user_list = self.channel_layer.user_list[self.room_name]
        i, user = next(((i, u) for i, u in enumerate(user_list) if u['user_id'] == self.user_id), (None, None))
        if user:
            if self.connection_id in user['connection_ids']:
                user['connection_ids'].remove(self.connection_id)
            if user['connection_ids']:
                user_list[i] = user
            else:
                user_list.pop(i)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'send_data',
                        'note': 'disconnected',
                        'nickname': self.nickname,
                        'hash': self.hash
                    }
                )
