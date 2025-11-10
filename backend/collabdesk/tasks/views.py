from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task
from .serializers import TaskSerializer
from collabdesk.middleware import set_workspace_context
import logging

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
            return Task.objects.filter(workspace=self.request.workspace).select_related(
                "created_by", "assignee", "workspace"
            )

        # Otherwise, return tasks from all user's workspaces
        logger.info(f"Fetching tasks from all workspaces for user={user.email}")
        user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
        return Task.objects.filter(workspace_id__in=user_workspaces).select_related(
            "created_by", "assignee", "workspace"
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
        """
        obj = serializer.save()
        # set completed_at automatically when status is DONE and completed_at not set
        if obj.status == Task.Status.DONE and obj.completed_at is None:
            import django.utils.timezone as tz

            obj.completed_at = tz.now()
            obj.save()

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """Archive a task"""
        task = self.get_object()
        task.archived = True
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)
