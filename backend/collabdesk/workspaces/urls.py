from django.urls import path
from .views import WorkspaceInformationView, WorkspaceListView

app_name = "workspaces"
urlpatterns = [
    path(
        "information/", WorkspaceInformationView.as_view(), name="workspace-information"
    ),
    path("list/", WorkspaceListView.as_view(), name="workspace-name-list"),
]
