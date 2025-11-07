from django.urls import path
from .views import *

app_name = "resources"
urlpatterns = [
    path("", ResourceCreateView.as_view(), name="resource-list"),
    path("<uuid:pk>/", ResourceDetailView.as_view(), name="resource-detail"),
    path("<uuid:pk>/download/", ResourcePresignedUrlView.as_view(), name="resource-download"),
]
