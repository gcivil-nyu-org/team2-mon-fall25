from django.urls import path
from . import views
from .views import *

urlpatterns = [
    path('events/', EventListCreateView.as_view(), name='event-list'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('unavailability/', UnavailabilityListCreateView.as_view(), name='Unava-list'),
    path('unavailability/<int:pk>', UnavailabilityDetailView.as_view(), name='Unava-detail'),
]
