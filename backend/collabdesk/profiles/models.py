import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

# Create your models here.


class Profile(models.Model):
    profile_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=50, default="none")
    avatar_url = models.CharField(max_length=100, default="none")
    bio = models.CharField(max_length=200, default="none")
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):  # type: ignore[arg-type]
        return self.full_name
