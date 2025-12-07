"""
URL Configuration for AI Chat Feature
"""

from django.urls import path
from .views import (
    DocumentUploadView,
    ConversationCreateView,
    ConversationListView,
    ConversationDetailView,
    ConversationDeleteView,
    SaveToNotesView,
)

urlpatterns = [
    # Document upload
    path("documents/upload/", DocumentUploadView.as_view(), name="document-upload"),
    # Conversation management
    path("conversations/", ConversationListView.as_view(), name="conversation-list"),
    path(
        "conversations/create/",
        ConversationCreateView.as_view(),
        name="conversation-create",
    ),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "conversations/<int:pk>/delete/",
        ConversationDeleteView.as_view(),
        name="conversation-delete",
    ),
    path(
        "conversations/<int:pk>/save-notes/",
        SaveToNotesView.as_view(),
        name="conversation-save-notes",
    ),
]
