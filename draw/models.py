from django.db import models
from django.contrib.postgres.fields import ArrayField

# Create your models here.

class DrawingBoard(models.Model):
    name = models.TextField(default='')
    password = models.TextField(default='', blank=True)


class Artist(models.Model):
    nickname = models.TextField(default='')
    connection_id = models.TextField(default='')
    board = models.ForeignKey(DrawingBoard, on_delete=models.DO_NOTHING)


class Drawing(models.Model):
    artist = models.ForeignKey(Artist, on_delete=models.DO_NOTHING)


class Segment(models.Model):
    drawing = models.ForeignKey(Drawing, on_delete=models.DO_NOTHING)
    coords = ArrayField(ArrayField(models.IntegerField(default=0), size=2), size=2)
