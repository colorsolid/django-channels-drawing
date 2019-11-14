from   channels.generic.websocket import AsyncWebsocketConsumer
import channels.layers
import json
import os
import random
import string



def random_string(string_length=20):
    '''Generate a random string of letters, digits and special characters'''
    return ''.join([random.choice(string.ascii_letters + string.digits) for n in range(string_length)])


class DrawConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(self.scope)
        self.room_name = self.scope['url_route']['kwargs']['room_name'].lower()
        await self.assign_id()
        self.room_group_name = 'draw_' + self.room_name
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    # message from client, data['type'] calls named function
    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            data
        )


    async def assign_id(self):
        self.id = random_string()

        await self.channel_layer.group_add(
            self.id,
            self.channel_name
        )

        await self.channel_layer.group_send(
            self.id,
            {
                'type': 'send_id',
                'id': self.id
            }
        )

        await self.channel_layer.group_discard(
            self.id,
            self.channel_name
        )


    # message to client, called data['type'] in receive()
    async def draw(self, data):
        await self.send(text_data=json.dumps(data))


    async def send_id(self, data):
        print(data)
        await self.send(text_data=json.dumps({'new_id': data['id']}))


    async def save(self, data):
        pass
