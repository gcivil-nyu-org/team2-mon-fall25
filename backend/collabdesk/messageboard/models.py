from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Message(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    content = models.TextField()
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="messages",
        default="cdb5abfe-dc99-4394-ac0e-e50a2f21d960",
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="messages"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)  # soft delete

    def __str__(self):
        return f"{self.author} - {self.content[:40]}"


class Reaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="reactions"
    )
    reaction_type = models.CharField(max_length=32)  # e.g. "like", "party", "love"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "message", "reaction_type")
