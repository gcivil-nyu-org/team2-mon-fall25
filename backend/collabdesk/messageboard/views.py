# messageboard/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from .models import Message, Reaction
from .serializers import MessageSerializer
from .permissions import IsAuthorOrReadOnly
from collabdesk.middleware import set_workspace_context
import logging

logger = logging.getLogger(__name__)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter messages by workspace context.
        Messages are strictly scoped to workspaces - users can only see messages
        from the workspace specified in the X-Workspace-ID header.
        """
        user = self.request.user
        user_identifier = getattr(user, "email", "anonymous")

        # Workspace context MUST be set for message board access
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for message access by user={user_identifier}. "
                f"X-Workspace-ID header is required."
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        # Return only messages from the specified workspace
        logger.info(
            f"Fetching messages for user={user_identifier}, "
            f"workspace={self.request.workspace.name} (ID: {self.request.workspace.workspace_id})"
        )
        return Message.objects.filter(
            workspace=self.request.workspace, parent=None
        ).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Create message and automatically set workspace from request context.
        Raises PermissionDenied if no workspace context is set.
        """
        user_identifier = getattr(self.request.user, "email", "anonymous")

        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for message creation by user={user_identifier}"
            )
            raise PermissionDenied("Workspace context is required to create a message.")

        logger.info(
            f"Creating message in workspace={self.request.workspace.name} "
            f"by user={user_identifier}"
        )
        serializer.save(author=self.request.user, workspace=self.request.workspace)


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthorOrReadOnly]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter messages by workspace context to ensure users can only access
        messages from the workspace specified in X-Workspace-ID header.
        """
        user = self.request.user
        user_identifier = getattr(user, "email", "anonymous")

        # Workspace context MUST be set
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for message detail access by user={user_identifier}. "
                f"X-Workspace-ID header is required."
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        # Return only messages from the specified workspace
        logger.info(
            f"Fetching message detail for user={user_identifier}, "
            f"workspace={self.request.workspace.name} (ID: {self.request.workspace.workspace_id})"
        )
        return Message.objects.filter(workspace=self.request.workspace).select_related(
            "author"
        )


class ReactionToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def post(self, request, pk):
        """
        Toggle a reaction on a message. Verify the message belongs to the current workspace.
        """
        user = request.user
        user_identifier = getattr(user, "email", "anonymous")

        # Workspace context MUST be set
        if not hasattr(request, "workspace") or not request.workspace:
            logger.error(
                f"No workspace context for reaction by user={user_identifier}. "
                f"X-Workspace-ID header is required."
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        # Try to get the message, ensuring it belongs to the current workspace
        try:
            message = Message.objects.filter(pk=pk, workspace=request.workspace).get()
        except Message.DoesNotExist:
            logger.warning(
                f"Message {pk} not found in workspace {request.workspace.workspace_id} "
                f"for user={user_identifier}"
            )
            return Response(
                {"detail": "Message not found in this workspace."},
                status=status.HTTP_404_NOT_FOUND,
            )

        reaction_type = request.data.get("emoji") or request.data.get("reaction_type")

        user_auth0_sub = getattr(request.user, "auth0_sub", None)
        if not user_auth0_sub:
            return Response(
                {"detail": "User identifier missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = Reaction.objects.filter(
            user__auth0_sub=user_auth0_sub, message=message, reaction_type=reaction_type
        )

        if existing.exists():
            existing.delete()
            status_code = status.HTTP_200_OK
            return Response({"detail": "Reaction removed."}, status=status.HTTP_200_OK)
        else:
            Reaction.objects.create(
                user=request.user, message=message, reaction_type=reaction_type
            )
            status_code = status.HTTP_201_CREATED
        updated_serializer = MessageSerializer(message)
        return Response(updated_serializer.data, status=status_code)
