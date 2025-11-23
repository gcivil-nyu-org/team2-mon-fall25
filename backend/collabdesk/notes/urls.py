from django.urls import path
from .views import (
    NoteListCreateView,
    NoteListByWorkspaceView,
    NoteDeleteView,
    NoteUpdateView,
)

urlpatterns = [
    path("create/", NoteListCreateView.as_view(), name="notes_create"),
    path("list/", NoteListByWorkspaceView.as_view(), name="notes-by-workspace"),
    path("delete/<str:note_id>/", NoteDeleteView.as_view(), name="note-delete"),
    path("update/<str:note_id>/", NoteUpdateView.as_view(), name="note-update"),
]
