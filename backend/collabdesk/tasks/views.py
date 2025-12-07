from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

# from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task

# from .serializers import TaskSerializer
from collabdesk.middleware import set_workspace_context
import logging

# from .serializers import TaskSerializer
from .serializers import TaskSerializer, UserMinimalSerializer, TaskDependencySerializer

# from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import PermissionDenied, ValidationError

logger = logging.getLogger(__name__)


class TaskViewSet(viewsets.ModelViewSet):
    """
    Provides list, retrieve, create, update, partial_update, destroy for tasks.
    Tasks are scoped to workspaces and filtered by user access.
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["title", "description"]
    ordering_fields = ["priority", "due_date", "created_at", "updated_at"]
    filterset_fields = ["status", "priority", "assignee", "created_by", "archived"]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter tasks by workspace context.
        If workspace is provided in header, filter by that workspace.
        Otherwise, return all tasks for user's workspaces.
        """
        user = self.request.user

        # If workspace context is set, filter by that workspace
        if hasattr(self.request, "workspace") and self.request.workspace:
            logger.info(
                f"Fetching tasks for user={user.email}, "
                f"workspace={self.request.workspace.name}"
            )
            return (
                Task.objects.filter(workspace=self.request.workspace)
                .select_related("created_by", "assignee", "workspace")
                .prefetch_related("dependencies")
            )

        # Otherwise, return tasks from all user's workspaces
        logger.info(f"Fetching tasks from all workspaces for user={user.email}")
        user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
        return (
            Task.objects.filter(workspace_id__in=user_workspaces)
            .select_related("created_by", "assignee", "workspace")
            .prefetch_related("dependencies")
        )

    def perform_create(self, serializer):
        """
        Automatically set workspace and created_by when creating a task.
        """
        logger.info("🔍 perform_create called for task")
        logger.info(f"   User: {self.request.user.email}")
        logger.info(f"   Has workspace attr: {hasattr(self.request, 'workspace')}")
        logger.info(
            f"   Workspace value: {getattr(self.request, 'workspace', 'NOT SET')}"
        )

        # Require workspace context for creating tasks
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error("❌ Workspace context missing! Raising PermissionDenied")
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        logger.info(
            f"✅ Creating task in workspace={self.request.workspace.name}, "
            f"user={self.request.user.email}"
        )

        serializer.save(workspace=self.request.workspace, created_by=self.request.user)

    def perform_update(self, serializer):
        """
        Handle task updates, including automatic completion timestamp.
        Enhanced with better dependency checking and status validation.
        """
        task = self.get_object()

        # Check if trying to mark as done with incomplete dependencies
        if "status" in serializer.validated_data:
            new_status = serializer.validated_data["status"]
            if new_status == Task.Status.DONE:
                if not task.can_complete:
                    incomplete_deps = task.dependencies.exclude(status=Task.Status.DONE)
                    dep_titles = [dep.title for dep in incomplete_deps]
                    raise ValidationError(
                        {
                            "status": f"Cannot mark as done. These dependencies must be completed first: {', '.join(dep_titles)}"
                        }
                    )

        # Save the task
        obj = serializer.save()

        # Set completed_at automatically when status is DONE
        if obj.status == Task.Status.DONE:
            if obj.completed_at is None:
                obj.completed_at = timezone.now()
                obj.save(update_fields=["completed_at"])
        # Clear completed_at if status is changed from DONE to something else
        elif obj.completed_at is not None:
            obj.completed_at = None
            obj.save(update_fields=["completed_at"])

    @action(detail=False, methods=["get"], url_path="workspace-members")
    def workspace_members(self, request):
        """
        Get list of users in the current workspace for task assignment.
        Requires workspace context (X-Workspace-ID header).
        """
        if not hasattr(request, "workspace") or not request.workspace:
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        # Get all members of the workspace
        workspace = request.workspace
        members = workspace.members.all().select_related("user")
        users = [member.user for member in members]

        serializer = UserMinimalSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="available-tasks")
    def available_tasks(self, request):
        """
        Get list of tasks in the current workspace for creating dependencies.
        Requires workspace context (X-Workspace-ID header).
        Optionally exclude a specific task (for edit mode) using ?exclude_id=<task_id>
        """
        if not hasattr(request, "workspace") or not request.workspace:
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        # Get all non-archived tasks in workspace
        tasks = Task.objects.filter(
            workspace=request.workspace, archived=False
        ).order_by("-created_at")

        # Optionally exclude a task (useful when editing to prevent self-dependency)
        exclude_id = request.query_params.get("exclude_id")
        if exclude_id:
            tasks = tasks.exclude(id=exclude_id)

        serializer = TaskDependencySerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """Archive a task"""
        task = self.get_object()
        task.archived = True
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)
