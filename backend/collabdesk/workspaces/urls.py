from django.urls import path
from .views import (
    WorkspaceInformationView,
    WorkspaceListView,
    WorkspaceCreateView,
    WorkspaceDeleteView,
)

app_name = "workspaces"
urlpatterns = [
    path(
        "information/", WorkspaceInformationView.as_view(), name="workspace-information"
    ),
    path("list/", WorkspaceListView.as_view(), name="workspace-name-list"),
    path("create/", WorkspaceCreateView.as_view(), name="workspace-create"),
    path(
        "<uuid:workspace_id>/delete/",
        WorkspaceDeleteView.as_view(),
        name="workspace-delete",
    ),
]
