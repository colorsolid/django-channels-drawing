from django.db import models

# Create your models here.


class DrawingBoard(models.Model):
    pass


class Artist(models.Model):
    nickname = models.TextField(default='')


class Drawing(models.Model):
    artist = models.ForeignKey(Artist, on_delete=models.DO_NOTHING)
