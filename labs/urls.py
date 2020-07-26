from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('3d/', views.printer, name='printer'),
    path('3dprint/', views.redirect_view, name='redirect'),
    path('3dprinter/', views.redirect_view, name='redirect')
]
