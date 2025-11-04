from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


# Create your models here.
class User(AbstractUser):
    """
    Custom User model that syncs with Auth0.
    Uses auth0_sub as the primary identifier for Auth0 users.
    """

    user_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    auth0_sub = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_index=True
    )
    full_name = models.CharField(max_length=255, blank=True)
    profile_picture = models.URLField(blank=True, null=True)

    # Override email to ensure it's unique
    email = models.EmailField(unique=True)

    class Meta:
        indexes = [
            models.Index(fields=["auth0_sub"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return self.email or self.username
