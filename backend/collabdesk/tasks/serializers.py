from rest_framework import serializers
from .models import Task
from users.models import User


class TaskSerializer(serializers.ModelSerializer):
    # Make workspace read-only since it's set automatically from context
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    # Make created_by read-only since it's set automatically from request.user
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    # Allow assignee to be set via user ID
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )

    # Add readable fields for user information
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )
    assignee_email = serializers.EmailField(
        source="assignee.email", read_only=True, allow_null=True
    )
    assignee_username = serializers.CharField(
        source="assignee.username", read_only=True, allow_null=True
    )
    workspace_name = serializers.CharField(source="workspace.name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "completed_at",
            "archived",
            "tags",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_email",
            "created_by_username",
            "assignee",
            "assignee_email",
            "assignee_username",
            "workspace",
            "workspace_name",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "completed_at",
            "workspace",
            "created_by",
            "created_by_email",
            "created_by_username",
            "assignee_email",
            "assignee_username",
            "workspace_name",
        ]
