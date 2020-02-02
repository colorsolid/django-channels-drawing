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
            except DrawingBoard.DoesNotExist:
                self.board = None
            try:
                self.artist = Artist.objects.get(user_id=self.user_id)
                if self.artist.nickname != self.nickname:
                    self.artist.nickname = self.nickname
                    self.artist.save()
            except Artist.DoesNotExist:
                self.artist = None
            self.drawing = None
            self.end_index = 0
            if self.board and self.artist:
                try:
                    self.drawing = Drawing.objects.get(artist=self.artist, board=self.board)
                    self.end_index = self.drawing.end_index
                except Drawing.DoesNotExist:
                    pass
            await self.send_load_data()
            self.segment_coords = []


    async def send_load_data(self):
        users = self.channel_layer.user_list[self.room_name]
        _users = []
        for user in users:
            _user = {
                'nickname': user['nickname'],
                'hash': user['user_id'][0:12],
                'group': '* * M A I N * *'
            }
            _users.append(_user)
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.add_user()
        data = {
            'note': 'load',
            'set_connection_id': self.connection_id,
            'users': _users
        }
        if self.board:
            drawings = ut.get_drawings(self.board, self.user_id)
            if drawings:
                data['drawings'] = drawings
        await self.send_data_no_type(data)


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
        data['nickname'] = self.nickname
        if not self.artist:
            self.artist = ut.try_artist(self.user_id, self.nickname)
        if not self.board:
            self.board = ut.try_board(self.room_name, self.artist)
            self.board.board_artists.add(self.artist)
        if not self.drawing:
            self.drawing, created = Drawing.objects.get_or_create(artist=self.artist, board=self.board)
        if 'stroke_arr' in data:
            if data['stroke_arr'] and data['type'] in ['draw', 'save']:
                if not self.clear_allowed:
                    self.clear_allowed = True
                self.segment_coords += data['stroke_arr'][0]
                if data['type'] == 'save':
                    self.save(data)
                    data['type'] = 'draw'
                await self.channel_layer.group_send(
                    self.room_group_name,
                    data
                )
            if data['type'] == 'clear':
                if self.clear_allowed:
                    segments = self.drawing.segment_set.all()
                    last = segments.last()
                    if not last.clear:
                        self.clear()
                        data['type'] = 'draw'
                        data['clear'] = True
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            data
                        )
            if data['type'] == 'undo':
                if self.undo(data):
                    await self.redraw(data)
            if data['type'] == 'redo':
                if self.redo(data):
                    await self.redraw(data)


    async def send_data_no_type(self, data):
        d = {k:data[k] for k in data if k !='type'}
        await self.send(text_data=json.dumps(d))


    # message to client, called data['type'] in receive()
    async def draw(self, data):
        if data['connection_id'] != self.connection_id:
            await self.send(text_data=json.dumps(data))


    async def redraw(self, data):
        data['type'] = 'draw'
        data['redraw'] = True
        data['segments'] = data.pop('stroke_arr')
        await self.channel_layer.group_send(
            self.room_group_name,
            data
        )


    def clear(self):
        print('clearing')
        self.clear_allowed = False
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


    def undo(self, data, *args):
        self.test_clear_allowed(data)
        if self.drawing.end_index > -1:
            self.drawing.end_index -= 1
            self.drawing.save()
            self.drawing.board.save()
            return True
        return False


    def redo(self, data, *args):
        self.test_clear_allowed(data)
        last_index = len(self.drawing.segment_set.all()) - 1
        if self.drawing.end_index < last_index:
            self.drawing.end_index += 1
            self.drawing.save()
            self.drawing.board.save()
            return True
        return False


    def test_clear_allowed(self, data):
        print('stroke_arr' in data)
        if 'stroke_arr' in data:
            print(len(data['stroke_arr']))
            print(data['stroke_arr'][0])
            if len(data['stroke_arr']) == 1 and data['stroke_arr'][0] == 'CLEAR':
                self.clear_allowed = False
            else:
                self.clear_allowed = True


    def save(self, data):
        self.drawing.end_index += 1
        self.drawing.save()
        self.drawing.board.save()
        self.drawing.segment_set.filter(index__gte=self.drawing.end_index).delete()
        thickness = int(data['stroke_width'])
        thickness = 20 if thickness > 20 else thickness
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
                    'type': 'send_data_no_type'
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
                'type': 'send_data_no_type'
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
                        'type': 'send_data_no_type',
                        'note': 'disconnected',
                        'nickname': self.nickname,
                        'hash': self.hash
                    }
                )
