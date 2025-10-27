from django.urls import path
from .views import *

app_name = "profiles"
urlpatterns = [
    path("", ProfileListCreateView.as_view(), name="profile-list"),
    path("<uuid:pk>/", ProfileDetailView.as_view(), name="profile-detail"),
]
