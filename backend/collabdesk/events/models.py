import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

# Create your models here.
class Event(models.Model):
    class EventType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", _("Individual Event")
        GROUP = "GROUP", _("Group Event")
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, default="none")
    description = models.CharField(max_length=1000, default="none")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    event_type = models.CharField(max_length=20, choices=EventType, default=EventType.GROUP)
    location = models.CharField(max_length=100, default="none")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1)
    workspace_id = models.ForeignKey('workspaces.Workspace', on_delete=models.CASCADE, default=uuid.UUID("cdb5abfe-dc99-4394-ac0e-e50a2f21d960"))
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title

