import channels.layers
import draw.utils as ut
import json
import os
import random
import string

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.sessions.backends.db import SessionStore
from django.db.models import F
from foli.utils import random_string
from .models import DrawingBoard, Artist, Drawing, Segment


# FIX UNDO, REDO, CLEAR DESYNC ON SAME USER WITH MULTIPLE CONNECTION IDS (sync segment index and update buttons)
# send end_index on undo, redo, clear, and save to user_id excluding connection_id


class DrawConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not hasattr(self.channel_layer, 'user_list'):
            self.channel_layer.user_list = {}
        if not hasattr(self.channel_layer, 'connection_ids'):
            self.channel_layer.connection_ids = []
        room_name = self.scope['url_route']['kwargs']['room_name']
        self.connection_id = random_string()
        while self.connection_id in self.channel_layer.connection_ids:
            self.connection_id = random_string()
        session = self.scope['session']
        self.user_id = session.get('user_id')
        self.hash = self.user_id[0:12]
        self.nickname = session.get('nickname')
        if not self.user_id or not self.nickname:
            await self.close()
        else:
            await self.accept()
            await self.load_room_data()


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
        data = ut.clean_data(data, ['self', 'redraw'])
        if data['type'] == 'draw':
            data = ut.clean_data(data, ['end_index'])
        data['connection_id'] = self.connection_id
        data['hash'] = self.hash
        data['nickname'] = self.nickname
        if not self.artist:
            self.artist = await ut.try_artist(self.user_id, self.nickname)
        if not self.board:
            self.board = await ut.try_board(self.room_name, self.artist)
            self.board.board_artists.add(self.artist)
        if not self.drawing:
            self.drawing, created = await database_sync_to_async(
                Drawing.objects.get_or_create
            )(artist=self.artist, board=self.board)
        if 'stroke_arr' in data:
            await self.handle_draw_data(data)


    async def load_room_data(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name'].lower()
        if not self.room_name in self.channel_layer.user_list:
            self.channel_layer.user_list[self.room_name] = []
        self.room_group_name = 'draw_' + self.room_name
        try:
            self.board = await database_sync_to_async(
                DrawingBoard.objects.get
            )(name=self.room_name)
        except DrawingBoard.DoesNotExist:
            self.board = None
        try:
            self.artist = await database_sync_to_async(
                Artist.objects.get
            )(user_id=self.user_id)
            if self.artist.nickname != self.nickname:
                self.artist.nickname = self.nickname
                self.artist.save()
        except Artist.DoesNotExist:
            self.artist = None
        self.drawing = None
        self.end_index = 0
        if self.board and self.artist:
            self.load_self_drawings()
        await self.send_load_data()
        await self.add_user()
        self.segment_coords = []
        await self.add_board_and_artist()


    @database_sync_to_async
    def load_self_drawings(self):
        try:
            self.drawing = Drawing.objects.get(
                artist=self.artist, board=self.board
            )
            self.end_index = self.drawing.end_index
            segments = self.drawing.segment_set.all()
            segment_length = len(segments)
            if self.end_index >= segment_length:
                for i, segment in enumerate(segments.order_by('index')):
                    segment.index = i
                    segment.save()
                self.end_index = segment_length - 1
                self.drawing.end_index = self.end_index
                self.drawing.save()
        except Drawing.DoesNotExist:
            pass


    async def send_load_data(self):
        users = self.channel_layer.user_list[self.room_name]
        user_data_clean = ut.clean_users(users)
        data = {
            'action': 'load',
            'set_connection_id': self.connection_id,
            'users': user_data_clean
        }
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        if self.board:
            drawings = await ut.get_drawings(self.board, self.user_id)
            if drawings:
                data['drawings'] = drawings
        await self.clean_and_send_data(data)


    async def add_board_and_artist(self):
        if not self.artist:
            self.artist = await ut.try_artist(self.user_id, self.nickname)
        if not self.board:
            self.board = await ut.try_board(self.room_name, self.artist)
            await database_sync_to_async(self.board.board_artists.add)(self.artist)
        if not self.drawing:
            self.drawing, created = await database_sync_to_async(Drawing.objects.get_or_create)(
                artist=self.artist, board=self.board
            )


    async def handle_draw_data(self, data):
        if data['stroke_arr'] and data['type'] in ['draw', 'save']:
            self.segment_coords += data['stroke_arr'][0]
            if data['type'] == 'save':
                await self.save(data)
                data['type'] = 'draw'
            await self.channel_layer.group_send(
                self.room_group_name,
                data
            )
        if data['type'] == 'clear':
            await self.clear()
            data['type'] = 'draw'
            data['clear'] = True
            data['redraw'] = True
            await self.channel_layer.group_send(
                self.room_group_name,
                data
            )
        if data['type'] == 'undo':
            if await self.undo(data):
                await self.redraw(data)
        if data['type'] == 'redo':
            if await self.redo(data):
                await self.redraw(data)


    async def clean_and_send_data(self, data):
        print('cas', self.user_id)
        data = ut.clean_data(data, ['user_id', 'type'])
        await self.send(text_data=json.dumps(data))


    # send drawing data to client
    async def draw(self, data):
        print(self.connection_id, 'draw')
        if data['connection_id'] != self.connection_id:
            i, user, user_list = ut.get_channel_user(self)
            # same user different session
            suds = (data['connection_id'] in user['connection_ids'])
            print(self.connection_id, user['connection_ids'], suds)
            if not suds:
                data = ut.clean_data(data, ['end_index', 'segment_count'])
            else:
                data['self'] = True
            await self.clean_and_send_data(data)


    async def redraw(self, data):
        print(self.connection_id, 'redraw')
        data['type'] = 'draw'
        data['redraw'] = True
        data['segments'] = data.pop('stroke_arr')
        await self.channel_layer.group_send(
            self.room_group_name,
            data
        )


    @database_sync_to_async
    def undo(self, data, *args):
        if self.drawing.end_index > -1:
            self.drawing.end_index -= 1
            self.drawing.save()
            self.drawing.board.save()
            return True
        return False


    def update_end_index(self, delta):
        self.drawing.end_index += delta


    @database_sync_to_async
    def redo(self, data, *args):
        segments = self.drawing.segment_set.all()
        last_index = len(segments) - 1
        if self.drawing.end_index < last_index:
            self.drawing.end_index += 1
            self.drawing.save()
            self.drawing.board.save()
            return True
        return False


    @database_sync_to_async
    def clear(self):
        self.drawing.end_index += 1
        self.drawing.save()
        self.drawing.board.save()
        self.drawing.segment_set.filter(index__gte=self.drawing.end_index).delete()
        segment = Segment(
            drawing = self.drawing,
            clear = True,
            index = self.drawing.end_index
        )
        segment.save()


    @database_sync_to_async
    def save(self, data):
        print('save', 'end_index' in data)
        '''Save drawing data to the database.'''
        i, user, _ = ut.get_channel_user(self)
        if len(user['connection_ids']) > 1:
            self.drawing, created = Drawing.objects.get_or_create(
                artist=self.artist, board=self.board
            )
        max_thickness = 150
        self.drawing.end_index += 1
        self.drawing.save()
        self.drawing.board.save()
        self.drawing.segment_set.filter(
            index__gte=self.drawing.end_index
        ).delete()
        thickness = int(data['stroke_width'])
        thickness = max_thickness if thickness > max_thickness else thickness
        thickness = 1 if thickness < 0 else thickness
        segment = Segment(
            drawing = self.drawing,
            color = data['stroke_color'],
            thickness = thickness,
            coords = self.segment_coords,
            index = self.drawing.end_index
        )
        segment.save()
        self.segment_coords = []


    async def add_user(self):
        '''Add newly connected user's data.

        Add new user to channel layer and notify the frontend.
        If user is already connected then add a new connection id.
        If the user has a new nickname then update the channel layer and notify
        the frontend.
        '''
        self.channel_layer.connection_ids.append(self.connection_id)
        i, user, user_list = ut.get_channel_user(self)
        channel_data = {}
        if user:
            if user['nickname'] != self.nickname:
                channel_data = {
                    'action': 'update',
                    'hash': self.hash,
                    'nickname': self.nickname,
                    'old_nickname': user['nickname'],
                    'type': 'clean_and_send_data'
                }
                user['nickname'] = self.nickname
            user['connection_ids'].append(self.connection_id)
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
                'action': 'connected',
                'connection_id': self.connection_id,
                'hash': self.hash,
                'type': 'clean_and_send_data'
            })
        if channel_data:
            await self.channel_layer.group_send(
                self.room_group_name,
                channel_data
            )


    async def remove_user(self):
        '''Remove disconnected user's data.

        Remove user from channel layer and notify the frontend.
        If user has multiple connections then only remove connection_id.
        '''
        self.channel_layer.connection_ids.remove(self.connection_id)
        i, user, user_list = ut.get_channel_user(self)
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
                        'type': 'clean_and_send_data',
                        'action': 'disconnected',
                        'nickname': self.nickname,
                        'hash': self.hash
                    }
                )
