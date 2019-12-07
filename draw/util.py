from    .models import DrawingBoard, Artist, Drawing, Segment


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


def get_drawings(board):
    drawings = board.drawing_set.all()
    _drawings = []
    for drawing in drawings:
        _drawing = {
            'nickname': drawing.artist.nickname,
            'hash': drawing.artist.user_id[0:12],
            'drawing_group': drawing.group_name,
            'segments': []
        }
        segments = drawing.segment_set.all()
        for segment in segments:
            _segment = {
                'color': segment.color,
                'coords': segment.coords,
                'thickness': segment.thickness
            }
            _drawing['segments'].append(_segment)
        if _drawing['segments']:
            _drawings.append(_drawing)
    return _drawings
