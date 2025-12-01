from django.contrib import admin
from .models import ChatDocument, AIConversation


@admin.register(ChatDocument)
class ChatDocumentAdmin(admin.ModelAdmin):
    list_display = ["file_name", "user", "workspace", "file_size", "uploaded_at"]
    list_filter = ["uploaded_at", "workspace"]
    search_fields = ["file_name", "user__email", "file_key"]
    readonly_fields = ["uploaded_at"]
    ordering = ["-uploaded_at"]


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "user",
        "workspace",
        "action_type",
        "saved_to_notes",
        "created_at",
    ]
    list_filter = ["action_type", "saved_to_notes", "created_at", "workspace"]
    search_fields = ["title", "user__email", "ai_response"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]
