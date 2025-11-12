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
    path(
        "user/",
        UserEventListView.as_view(),
        name="userEvent-detail",
    ),
    path(
        "recommend-slots/<str:event_date>/<int:duration>/",
        RecommendTimeSlots.as_view(),
        name="recommend-slots",
    ),
    path(
        "workspace/members/",
        WorkspaceMembersView.as_view(),
        name="workspace-members",
    ),
]
