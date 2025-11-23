from django.db import models
from django.conf import settings
from workspaces.models import Workspace


class Note(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="notes"
    )
    title = models.CharField(max_length=255)
    content = models.TextField()  # stores markdown / text blob
    tags = models.JSONField(default=list)  # ["work","ideas"]

    # Sharing fields (optional but your frontend expects them)
    is_shared = models.BooleanField(default=False)
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="shared_notes", blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
