from django.urls import path
from . import views
from .views import *

urlpatterns = [
    path('', EventListCreateView.as_view(), name='event-list'),
    path('<uuid:pk>/', EventDetailView.as_view(), name='event-detail'),
]
