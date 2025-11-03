from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Workspace, WorkspaceMember
from .serializer import WorkspaceSerializer


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
        ).values_list('workspace_id', flat=True)

        workspaces = Workspace.objects.filter(
            workspace_id__in=workspace_ids
        ).values("workspace_id", "name")

        return Response(list(workspaces))
