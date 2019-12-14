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


def get_drawings(board, user_id):
    drawings = board.drawing_set.all()
    _drawings = []
    for drawing in drawings:
        _drawing = {
            'nickname': drawing.artist.nickname,
            'hash': drawing.artist.user_id[0:12],
            'drawing_group': drawing.group_name,
            'segments': []
        }
        if user_id == drawing.artist.user_id:
            segments = drawing.segment_set.all().order_by('index')
            _drawing['user_id'] = user_id
            _drawing['end_index'] = drawing.end_index
        else:
            print(board.id, drawing.end_index, drawing.id)
            segments = drawing.segment_set.filter(index__lte=drawing.end_index).order_by('index')
            print([s.index for s in segments])
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
