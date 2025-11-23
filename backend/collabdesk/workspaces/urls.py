from django.urls import path
from .views import (
    WorkspaceInformationView,
    WorkspaceListView,
    WorkspaceCreateView,
    WorkspaceDeleteView,
    WorkspaceLeaveView,
    WorkspaceJoinView,
    WorkspaceMembersListView
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
    path(
        "<uuid:workspace_id>/leave/",
        WorkspaceLeaveView.as_view(),
        name="leave-workspace",
    ),
    path("join/", WorkspaceJoinView.as_view(), name="workspace-join"),
    path("<uuid:workspace_id>/members/", WorkspaceMembersListView.as_view(), name="workspace-members"),
]
