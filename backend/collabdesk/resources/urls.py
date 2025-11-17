from django.urls import path
from .views import *
from . import views

app_name = "resources"
urlpatterns = [
    # REST API (used by frontend)
    path("", ResourceCreateView.as_view(), name="resource-list"),
    path("<uuid:pk>/", ResourceDetailView.as_view(), name="resource-detail"),
    path(
        "<uuid:pk>/download/",
        ResourceDownloadView.as_view(),
        name="resource-download",
    ),
    path(
        "<uuid:pk>/preview/",
        ResourcePreviewView.as_view(),
        name="resource-preview",
    ),
    # Temporary function-based views (backup/alternative)
    path("upload/", views.upload_file, name="upload"),
    path("download/<str:file_key>/", views.download_file, name="download"),
    path("delete/<str:file_key>/", views.delete_file, name="delete"),
    path("list/", views.list_files, name="list"),
]
