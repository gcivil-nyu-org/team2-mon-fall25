from django.db import models
from django.conf import settings
import uuid
import random
import string

User = settings.AUTH_USER_MODEL

def generate_invite_code():
    """Generate a unique 8-character invite code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

class Workspace(models.Model):
    workspace_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_workspaces"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    invite_code = models.CharField(max_length=8,unique=True,default=generate_invite_code,editable=False
    )

    def save(self, *args, **kwargs):
        from django.utils import timezone

        now = timezone.now()
        if not self.pk:
            self.updated_at = now
        else:
            self.updated_at = now
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Role(models.Model):
    role_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    scope = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("member", "Member"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workspaces")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="member")
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invited_members",
    )
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("workspace", "user")


class Permission(models.Model):
    permission_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("role", "permission")
