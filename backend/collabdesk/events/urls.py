from django.urls import path
from .views import *

app_name = "events"
urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="event-detail"),
    path(
        "participants/", EventParticipantCreateView.as_view(), name="participant-list"
    ),
    path(
        "participants/<uuid:pk>/",
        EventParticipantDetailView.as_view(),
        name="participant-detail",
    ),
]
