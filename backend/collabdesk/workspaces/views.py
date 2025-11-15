from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Workspace, WorkspaceMember
from .serializer import WorkspaceSerializer, WorkspaceCreateSerializer, WorkspaceJoinSerializer


class WorkspaceInformationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workspace_id = request.query_params.get("workspace_id")

        # Validate input
        if not workspace_id:
            return Response(
                {"error": "workspace_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Use authenticated user instead of requiring user_id parameter
        user = request.user

        # Check if user is a member
        is_member = WorkspaceMember.objects.filter(
            workspace=workspace, user=user, is_active=True
        ).exists()

        serializer = WorkspaceSerializer(workspace)
        data = serializer.data
        data["is_member"] = is_member
        data["is_public"] = False  # you can extend model later

        # If user not member → strip members & owner info
        if not is_member:
            data.pop("members", None)
            data.pop("owner", None)

        return Response(data, status=status.HTTP_200_OK)


class WorkspaceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only return workspaces the user is a member of
        user = request.user
        workspace_ids = WorkspaceMember.objects.filter(
            user=user, is_active=True
        ).values_list("workspace_id", flat=True)

        workspaces = Workspace.objects.filter(workspace_id__in=workspace_ids).values(
            "workspace_id", "name"
        )

        return Response(list(workspaces))


class WorkspaceCreateView(generics.CreateAPIView):
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class WorkspaceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, workspace_id):
        """Delete a workspace if the current user created it"""
        user = request.user
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Only allow the creator to delete the workspace
        if workspace.created_by != user:
            return Response(
                {"detail": "You are not authorized to delete this workspace."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Delete the workspace (related members will auto-delete via on_delete=models.CASCADE)
        workspace.delete()
        return Response(
            {"detail": "Workspace deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class WorkspaceLeaveView(APIView):
    """
    Allow a workspace member (non-owner) to leave the workspace.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id):
        user = request.user
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Try to get membership
        membership = WorkspaceMember.objects.filter(
            workspace=workspace, user=user
        ).first()
        if not membership:
            return Response(
                {"detail": "You are not a member of this workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent the owner from leaving
        if membership.role == "owner":
            return Response(
                {
                    "detail": "Owners cannot leave the workspace until ownership transfer is implemented."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Delete membership to leave
        membership.delete()

        return Response(
            {"detail": "You have successfully left the workspace."},
            status=status.HTTP_200_OK,
        )
class WorkspaceJoinView(generics.GenericAPIView):
    serializer_class = WorkspaceJoinSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        workspace = serializer.save()

        return Response(
            {
                "message": "Joined workspace successfully",
                "workspace": WorkspaceSerializer(workspace).data
            },
            status=200
        )
