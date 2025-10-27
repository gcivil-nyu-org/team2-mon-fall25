from django.urls import path
import uuid
from . import views
from .views import *

app_name = "events"
urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="event-detail"),
]
