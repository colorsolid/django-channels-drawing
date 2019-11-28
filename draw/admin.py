from django.contrib import admin
from draw.models import Artist, DrawingBoard

# Register your models here.

class ArtistAdmin(admin.ModelAdmin):
    pass


class DrawingBoardAdmin(admin.ModelAdmin):
    pass


admin.site.register(Artist, ArtistAdmin)
admin.site.register(DrawingBoard, DrawingBoardAdmin)
