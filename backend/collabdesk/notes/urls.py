from django.urls import path
from .views import (
    NoteListCreateView,
    NoteListByWorkspaceView,
    NoteDeleteView,
    NoteUpdateView,
    ShareNoteView,
    SharedNotesListView,
)

urlpatterns = [
    path("create/", NoteListCreateView.as_view(), name="notes_create"),
    path("list/", NoteListByWorkspaceView.as_view(), name="notes-by-workspace"),
    path("delete/<str:note_id>/", NoteDeleteView.as_view(), name="note-delete"),
    path("update/<str:note_id>/", NoteUpdateView.as_view(), name="note-update"),
    path('<int:pk>/share/', ShareNoteView.as_view(), name='note-share'),
    path('<int:pk>/share/<int:user_id>/', ShareNoteView.as_view(), name='note-unshare'),
    path("shared/", SharedNotesListView.as_view(), name="shared-notes"),
]
