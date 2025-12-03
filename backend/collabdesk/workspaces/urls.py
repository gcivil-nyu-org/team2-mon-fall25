from django.urls import path
from .views import (
    WorkspaceInformationView,
    WorkspaceListView,
    WorkspaceCreateView,
    WorkspaceDeleteView,
    WorkspaceLeaveView,
    WorkspaceJoinView,
    WorkspaceMembersListView,
    WorkspaceAddMembersView,
    WorkspaceRemoveMemberView,
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
    path(
        "<uuid:workspace_id>/members/",
        WorkspaceMembersListView.as_view(),
        name="workspace-members",
    ),
    path(
    "<uuid:workspace_id>/members/add/",
    WorkspaceAddMembersView.as_view(),
    name="workspace-add-members",
),
path(
    "<uuid:workspace_id>/members/<str:user_id>/",
    WorkspaceRemoveMemberView.as_view(),
    name="workspace-remove-member",
),
]
