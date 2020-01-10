from    django.utils.safestring import mark_safe
from    foli.utils import random_phrase, random_string
from    .models import DrawingBoard, Artist, Drawing, Segment


def get_context(request):
    nickname = request.session.get('nickname')
    if not nickname:
        nickname = random_phrase('adj', 'noun')
        request.session['nickname'] = nickname
    user_id = request.session.get('user_id')
    if not user_id or user_id != user_id.lower():
        while True:
            user_id = random_string()
            try:
                artist = Artist.objects.get(user_id=user_id)
            except Artist.DoesNotExist:
                break
        request.session['user_id'] = user_id
    context = {
        'user_id': mark_safe(user_id),
        'nickname':  mark_safe(nickname)
    }
    return context


def try_artist(id, nickname):
    try:
        artist = Artist.objects.get(user_id=id)
        if artist.nickname != nickname:
            artist.nickname = nickname
            artist.save()
    except Artist.DoesNotExist:
        artist = Artist.objects.create(user_id=id, nickname=nickname)
    return artist


def try_board(room_name, artist):
    try:
        board = DrawingBoard.objects.get(name=room_name)
    except DrawingBoard.DoesNotExist:
        board = DrawingBoard.objects.create(name=room_name, creator=artist)
    return board


def get_drawings(board, user_id):
    drawings = board.drawing_set.all()
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
            segments = drawing.segment_set.all().order_by('index')
            _drawing['user_id'] = user_id
        else:
            segments = drawing.segment_set.filter(index__lte=drawing.end_index).order_by('index')
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
