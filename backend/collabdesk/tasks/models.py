from django.db import models
from django.conf import settings
import uuid


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in-progress", "In progress"
        DONE = "done", "Done"

    class Priority(models.IntegerChoices):
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"
        # URGENT = 4, "Urgent"

    title = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_tasks",
        on_delete=models.CASCADE,
        default=1,
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="tasks",
        default=uuid.UUID("cdb5abfe-dc99-4394-ac0e-e50a2f21d960"),
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.TODO
    )
    priority = models.IntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.JSONField(blank=True, default=list)
    archived = models.BooleanField(default=False)
    # Dependencies - tasks that must be completed before this one
    dependencies = models.ManyToManyField(
        "self",
        symmetrical=False,
        related_name="dependent_tasks",
        blank=True,
        help_text="Tasks that must be completed before this task",
    )

    class Meta:
        ordering = ["-priority", "due_date", "-created_at"]
        indexes = [
            models.Index(fields=["workspace", "created_at"]),
            models.Index(fields=["created_by", "created_at"]),
            models.Index(fields=["assignee", "status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    @property
    def can_complete(self):
        """Check if all dependencies are completed"""
        return not self.dependencies.exclude(status=self.Status.DONE).exists()
