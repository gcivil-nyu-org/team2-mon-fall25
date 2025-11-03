from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField


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
    # creator = models.ForeignKey(
    #     settings.AUTH_USER_MODEL,
    #     related_name="created_tasks",
    #     on_delete=models.CASCADE,
    # )
    # assignee = models.ForeignKey(
    #     settings.AUTH_USER_MODEL,
    #     related_name="assigned_tasks",
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    # )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.TODO
    )
    priority = models.IntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    creator = models.CharField(max_length=100, default="admin")
    assignee = models.CharField(max_length=100, blank=True, null=True, default="megha")
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.JSONField(blank=True, default=list)
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["-priority", "due_date", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
