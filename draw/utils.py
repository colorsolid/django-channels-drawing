from channels.db import database_sync_to_async
from django.utils.safestring import mark_safe
from foli.utils import random_phrase, random_string
from .models import DrawingBoard, Artist, Drawing, Segment


def get_context(request, context={}):
    nickname = request.session.get('nickname')
    if not nickname:
        nickname = random_phrase('adj', 'noun')
        request.session['nickname'] = nickname
    user_id = request.session.get('user_id')
    if not user_id or user_id != user_id.lower():
        while True:
            user_id = random_string()
            try:
                artist = Artist.objects.get(user_id__startswith=user_id[0:12])
            except Artist.DoesNotExist:
                break
        request.session['user_id'] = user_id
    context.update({
        'user_hash': mark_safe(user_id[0:12]),
        'nickname':  mark_safe(nickname)
    })
    return context


@database_sync_to_async
def try_artist(id, nickname):
    try:
        artist = Artist.objects.get(user_id=id)
        if artist.nickname != nickname:
            artist.nickname = nickname
            artist.save()
    except Artist.DoesNotExist:
        artist = Artist.objects.create(user_id=id, nickname=nickname)
    return artist


@database_sync_to_async
def try_board(room_name, artist):
    try:
        board = DrawingBoard.objects.get(name=room_name)
    except DrawingBoard.DoesNotExist:
        board = DrawingBoard.objects.create(name=room_name, creator=artist)
    return board


@database_sync_to_async
def get_drawings(board, user_id):
    drawings = board.drawing_set.all().order_by('artist__nickname')
    _drawings = []
    for drawing in drawings:
        _drawing = {
            'nickname': drawing.artist.nickname,
            'hash': drawing.artist.user_id[0:12],
            'drawing_group': drawing.group_name,
            'segments': [],
            'end_index': drawing.end_index
        }
        if user_id == drawing.artist.user_id:
            _drawing['self'] = True
            segments = drawing.segment_set.all().order_by('index')
            if len(segments):
                last = segments[len(segments) - 1]
                _drawing['color'] = last.color
                _drawing['thickness'] = last.thickness
            else:
                _drawing['color'] = '#000000'
                _drawing['thickness'] = 3
        else:
            segments = drawing.segment_set.filter(
                index__lte=drawing.end_index
            ).order_by('index')
            clears = segments.filter(clear=True)
            if clears:
                start_index = clears.reverse()[0].index
                segments = segments.filter(index__gte=start_index)
        for segment in segments:
            _segment = {}
            if segment.coords:
                _segment['color'] = segment.color
                _segment['coords'] = segment.coords
                _segment['thickness'] = segment.thickness
            if segment.clear:
                _segment = 'CLEAR'
            if _segment:
                _drawing['segments'].append(_segment)
        if _drawing['segments']:
            _drawings.append(_drawing)
    return _drawings


def clean_users(user_data_full):
    user_data_clean = []
    for user_full in user_data_full:
        user_clean = {
            'nickname': user_full['nickname'],
            'hash': user_full['user_id'][0:12],
            'group': '* * M A I N * *'
        }
        user_data_clean.append(user_clean)
    return user_data_clean


# remove_keys = always remove
# remove_other = remove if data comes from a different user
# remove_same = remove if data comes from the same user
def clean_data(data, remove_keys=[], remove_other=[], remove_same=[]):
    data_clean = {k:data[k] for k in data if k not in remove_keys}
    print('clean data')
    return data_clean


def get_channel_user(consumer):
    user_list = consumer.channel_layer.user_list[consumer.room_name]
    i, user = next(((i, u) for i, u in enumerate(user_list) if u['user_id'] == consumer.user_id), (None, None))
    return i, user, user_list
