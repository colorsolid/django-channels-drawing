from django.db import models
from django.contrib.postgres.fields import ArrayField

# Create your models here.

class DrawingBoard(models.Model):
    creator = models.ForeignKey('Artist', on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=50, default='')
    password = models.CharField(max_length=50, default='', blank=True)
    artists = models.ManyToManyField('Artist', related_name='artist_boards')


class Artist(models.Model):
    nickname = models.CharField(max_length=50, default='')
    user_id = models.CharField(max_length=40, default='')
    boards = models.ManyToManyField(DrawingBoard, related_name='board_artists')


class Drawing(models.Model):
    artist = models.ForeignKey(Artist, on_delete=models.DO_NOTHING)
    board = models.ForeignKey(DrawingBoard, on_delete=models.DO_NOTHING, null=True)
    group_name = models.CharField(max_length=16, default='* * M A I N * *')
    end_index = models.IntegerField(default=-1)


class Segment(models.Model):
    index = models.IntegerField(default=0)
    drawing = models.ForeignKey(Drawing, on_delete=models.DO_NOTHING)
    clear = models.BooleanField(default=False)
    color = models.CharField(max_length=20, default='#000', null=True)
    coords = ArrayField(ArrayField(models.IntegerField(default=0), size=2), null=True)
    thickness = models.IntegerField(default=1)
