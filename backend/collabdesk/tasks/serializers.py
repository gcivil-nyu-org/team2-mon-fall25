from rest_framework import serializers
from .models import Task
from users.models import User


class TaskDependencySerializer(serializers.ModelSerializer):
    """Minimal serializer for task dependencies"""

    class Meta:
        model = Task
        fields = ["id", "title", "status", "priority"]


class TaskSerializer(serializers.ModelSerializer):
    # Make workspace read-only since it's set automatically from context
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    # Make created_by read-only since it's set automatically from request.user
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    # Allow assignee to be set via user ID
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    # Dependencies - accept list of task IDs
    dependencies = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Task.objects.all(), required=False, allow_null=True
    )

    # Read-only detailed dependency information
    dependency_details = TaskDependencySerializer(
        source="dependencies", many=True, read_only=True
    )

    # Can this task be completed (all dependencies done)?
    can_complete = serializers.BooleanField(read_only=True)
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
    assignee_full_name = serializers.CharField(
        source="assignee.full_name", read_only=True, allow_null=True
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
            "assignee_full_name",
            "workspace",
            "workspace_name",
            "dependencies",
            "dependency_details",
            "can_complete",
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
            "assignee_full_name",
            "assignee_email",
            "assignee_username",
            "workspace_name",
            "dependency_details",
            "can_complete",
        ]

    # ADD THESE VALIDATION METHODS:
    def validate_dependencies(self, value):
        """Validate that dependencies don't create cycles"""
        if not value:
            return value

        # If updating, check for circular dependencies
        if self.instance:
            task_id = self.instance.id

            # Get current dependencies to compare
            current_dep_ids = set(
                self.instance.dependencies.values_list("id", flat=True)
            )
            new_dep_ids = set(dep.id for dep in value)

            # Only check newly added dependencies
            added_deps = new_dep_ids - current_dep_ids

            for dep in value:
                if dep.id == task_id:
                    raise serializers.ValidationError("A task cannot depend on itself")

                # Only validate newly added dependencies for circular reference
                if dep.id in added_deps:
                    if self._would_create_cycle(task_id, dep.id):
                        raise serializers.ValidationError(
                            f"Adding dependency '{dep.title}' would create a circular dependency"
                        )

        return value

    def _would_create_cycle(self, task_id, new_dep_id):
        """Check if adding new_dep_id as a dependency would create a cycle"""
        visited = set()

        def has_path(from_id, to_id):
            if from_id == to_id:
                return True
            if from_id in visited:
                return False
            visited.add(from_id)

            # Get all tasks that depend on from_id
            dependent_tasks = Task.objects.filter(dependencies__id=from_id)
            for task in dependent_tasks:
                if has_path(task.id, to_id):
                    return True
            return False

        # Check if new_dep has a path back to task
        return has_path(new_dep_id, task_id)


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for workspace members list"""

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "first_name", "last_name"]
