from    channels.generic.websocket import AsyncWebsocketConsumer
import  channels.layers
from    django.contrib.sessions.backends.db import SessionStore
from    django.db.models import F
import  draw.utils as ut
import  json
import  os
import  random
import  string
from    foli.utils import random_string
from    .models import DrawingBoard, Artist, Drawing, Segment


class DrawConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not hasattr(self.channel_layer, 'user_list'):
            self.channel_layer.user_list = {}
        room_name = self.scope['url_route']['kwargs']['room_name']
        self.clear_allowed = True
        self.connection_id = random_string()
        session = self.scope['session']
        self.user_id = session.get('user_id')
        self.hash = self.user_id[0:12]
        self.nickname = session.get('nickname')
        if not self.user_id or not self.nickname:
            await self.close()
        else:
            await self.accept()
            self.room_name = self.scope['url_route']['kwargs']['room_name'].lower()
            if not self.room_name in self.channel_layer.user_list:
                self.channel_layer.user_list[self.room_name] = []
            self.room_group_name = 'draw_' + self.room_name
            try:
                self.board = DrawingBoard.objects.get(name=self.room_name)
                await self.send_load_data()
            except DrawingBoard.DoesNotExist:
                self.board = None
            print(self.board, self.room_name)
            try:
                self.artist = Artist.objects.get(user_id=self.user_id)
            except Artist.DoesNotExist:
                self.artist = None
            self.drawing = None
            self.end_index = 0
            if self.board and self.artist:
                try:
                    self.drawing = Drawing.objects.get(artist=self.artist, board=self.board)
                    self.end_index = self.drawing.end_index
                except Drawing.DoesNotExist:
                    print('woops')
            self.segment_coords = []


    async def send_load_data(self):
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.add_user()
        drawings = ut.get_drawings(self.board, self.user_id)
        if drawings:
            data = {
                'note': 'load',
                'drawings': drawings,
                'set_connection_id': self.connection_id
            }
            await self.send_data(data)


    async def disconnect(self, close_code):
        if self.user_id and self.nickname:
            await self.remove_user()
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        data['connection_id'] = self.connection_id
        data['hash'] = self.hash
        if not self.artist:
            self.artist = ut.try_artist(self.user_id, self.nickname)
        if not self.board:
            self.board = ut.try_board(self.room_name, self.artist)
            self.board.board_artists.add(self.artist)
        if not self.drawing:
            self.drawing, created = Drawing.objects.get_or_create(artist=self.artist, board=self.board)
        if 'stroke_arr' in data:
            if data['stroke_arr']:
                if not self.clear_allowed:
                    self.clear_allowed = True
                self.segment_coords += data['stroke_arr'][0]
                if data['type'] == 'save':
                    await self.save(data)
                    data['type'] = 'draw'
                await self.channel_layer.group_send(
                    self.room_group_name,
                    data
                )
            if data['type'] == 'clear':
                if self.clear_allowed:
                    self.clear()
            if data['type'] == 'undo':
                self.undo()
            if data['type'] == 'redo':
                self.redo()


    def clear(self):
        if self.clear_allowed:
            segments = self.drawing.segment_set.all()
            last = segments.last()
            if not last.clear:
                self.clear_allowed = False
                index = len(segments)
                segment = Segment(
                    drawing = self.drawing,
                    clear = True,
                    index = index
                )
                segment.save()
                self.drawing.end_index = index
                self.drawing.save()


    def undo(self):
        if self.drawing.end_index > -1:
            self.drawing.end_index -= 1
            self.drawing.save()


    def redo(self):
        last_index = len(self.drawing.segment_set.all())
        if self.drawing.end_index < last_index:
            self.drawing.end_index += 1
            self.drawing.save()


    # message to client, called data['type'] in receive()
    async def draw(self, data):
        if data['connection_id'] != self.connection_id:
            await self.send(text_data=json.dumps(data))


    async def send_data(self, data):
        d = {k:data[k] for k in data if k !='type'}
        await self.send(text_data=json.dumps(d))


    async def save(self, data):
        index = len(self.drawing.segment_set.all())
        segment = Segment(
            drawing = self.drawing,
            color = data['stroke_color'],
            coords = self.segment_coords,
            index = index
        )
        segment.save()
        self.drawing.end_index = index
        self.drawing.save()
        self.segment_coords = []


    async def add_user(self):
        user_list = self.channel_layer.user_list[self.room_name]
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
            channel_data = {
                k:user_data[k] for k in user_data if k not in ['user_id', 'connection_ids']
            }
            channel_data.update({
                'note': 'connected',
                'connection_id': self.connection_id,
                'hash': self.hash,
                'type': 'send_data'
            })
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
