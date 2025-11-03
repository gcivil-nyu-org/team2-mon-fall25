from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .serializers import EventSerializer, EventParticipantSerializer
from .models import Event, EventParticipant
from collabdesk.middleware import set_workspace_context
import logging

logger = logging.getLogger(__name__)


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter events by workspace context.
        If workspace is provided in header, filter by that workspace.
        Otherwise, return all events for user's workspaces.
        """
        user = self.request.user

        # If workspace context is set, filter by that workspace
        if hasattr(self.request, 'workspace') and self.request.workspace:
            logger.info(
                f"Fetching events for user={user.email}, "
                f"workspace={self.request.workspace.name}"
            )
            return Event.objects.filter(workspace=self.request.workspace)

        # Otherwise, return events from all user's workspaces
        logger.info(f"Fetching events from all workspaces for user={user.email}")
        user_workspaces = user.workspaces.values_list('workspace_id', flat=True)
        return Event.objects.filter(workspace_id__in=user_workspaces)

    def perform_create(self, serializer):
        """
        Automatically set workspace and created_by when creating an event.
        """
        # Debug logging
        logger.info(f"🔍 perform_create called")
        logger.info(f"   User: {self.request.user.email}")
        logger.info(f"   Has workspace attr: {hasattr(self.request, 'workspace')}")
        logger.info(f"   Workspace value: {getattr(self.request, 'workspace', 'NOT SET')}")
        logger.info(f"   Workspace role: {getattr(self.request, 'workspace_role', 'NOT SET')}")

        # Require workspace context for creating events
        if not hasattr(self.request, 'workspace') or not self.request.workspace:
            logger.error(f"❌ Workspace context missing! Raising PermissionDenied")
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        logger.info(
            f"✅ Creating event in workspace={self.request.workspace.name}, "
            f"user={self.request.user.email}"
        )

        serializer.save(
            workspace=self.request.workspace,
            created_by=self.request.user
        )


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter events by workspace context to ensure users can only
        access events from their workspaces.
        """
        user = self.request.user

        # If workspace context is set, use it
        if hasattr(self.request, 'workspace') and self.request.workspace:
            return Event.objects.filter(workspace=self.request.workspace)

        # Otherwise, filter by user's workspaces
        user_workspaces = user.workspaces.values_list('workspace_id', flat=True)
        return Event.objects.filter(workspace_id__in=user_workspaces)


class EventParticipantCreateView(generics.ListCreateAPIView):
    queryset = EventParticipant.objects.all()
    serializer_class = EventParticipantSerializer
    permission_classes = [IsAuthenticated]


class EventParticipantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EventParticipant.objects.all()
    serializer_class = EventParticipantSerializer
    permission_classes = [IsAuthenticated]
