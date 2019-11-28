from django.db import models
from django.contrib.postgres.fields import ArrayField

# Create your models here.

class DrawingBoard(models.Model):
    creator = models.ForeignKey('Artist', on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=50, default='')
    password = models.CharField(max_length=50, default='', blank=True)


class DrawingBoardGroup(models.Model):
    name = models.CharField(max_length=16, default='--MAIN--')
    board = models.OneToOneField(DrawingBoard, on_delete=models.CASCADE, primary_key=True)


class Artist(models.Model):
    nickname = models.CharField(max_length=50, default='')
    user_id = models.CharField(max_length=40, default='')
    boards = models.ManyToManyField(DrawingBoard)
    groups = models.ManyToManyField(DrawingBoardGroup)


class Drawing(models.Model):
    artist = models.ForeignKey(Artist, on_delete=models.DO_NOTHING)
    board = models.ForeignKey(DrawingBoard, on_delete=models.DO_NOTHING, null=True)


class Segment(models.Model):
    drawing = models.ForeignKey(Drawing, on_delete=models.DO_NOTHING)
    color = models.CharField(max_length=20, default='#000')
    coords = ArrayField(ArrayField(models.IntegerField(default=0), size=2))
    thickness = models.IntegerField(default=1)
