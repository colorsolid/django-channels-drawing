from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('trest/', views.email, name='email')
]
