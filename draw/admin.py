from django.contrib import admin
from draw.models import Artist, DrawingBoard, Drawing, Segment

# Register your models here.

class ArtistAdmin(admin.ModelAdmin):
    pass


class DrawingBoardAdmin(admin.ModelAdmin):
    pass


class DrawingAdmin(admin.ModelAdmin):
    pass


class SegmentAdmin(admin.ModelAdmin):
    pass


admin.site.register(Artist, ArtistAdmin)
admin.site.register(DrawingBoard, DrawingBoardAdmin)
admin.site.register(Drawing, DrawingAdmin)
admin.site.register(Segment, SegmentAdmin)
