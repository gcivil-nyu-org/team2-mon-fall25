from django.db import models
from django.conf import settings
from workspaces.models import Workspace


class ChatDocument(models.Model):
    """Store S3 file references for uploaded documents"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_documents",
    )
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="chat_documents"
    )
    file_key = models.CharField(
        max_length=255, help_text="S3 key (UUID-prefixed filename)"
    )
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.BigIntegerField(help_text="File size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["user", "workspace", "-uploaded_at"]),
        ]

    def __str__(self):
        return f"{self.file_name} (uploaded by {self.user.email})"


class AIConversation(models.Model):
    """Store AI-generated summaries and plans for documents"""

    ACTION_TYPE_CHOICES = [
        ("summary", "Summary"),
        ("plan", "Plan"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="ai_conversations"
    )
    document = models.ForeignKey(
        ChatDocument, on_delete=models.CASCADE, related_name="conversations"
    )
    action_type = models.CharField(
        max_length=10,
        choices=ACTION_TYPE_CHOICES,
        help_text="Type of AI action (summary or plan)",
    )
    title = models.CharField(max_length=255, help_text="Auto-generated title")
    ai_response = models.TextField(help_text="AI-generated content")
    saved_to_notes = models.BooleanField(
        default=False, help_text="Whether this has been saved to notes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "workspace", "-created_at"]),
            models.Index(fields=["document", "action_type"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def save(self, *args, **kwargs):
        """Auto-generate title if not provided"""
        if not self.title:
            self.title = f"{self.action_type.title()} - {self.document.file_name}"
        super().save(*args, **kwargs)
