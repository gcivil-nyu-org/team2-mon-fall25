from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from urllib.parse import unquote
from .models import Workspace, WorkspaceMember
from .serializer import WorkspaceSerializer


class WorkspaceInformationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workspace_id = request.query_params.get("workspace_id")
        user_id = request.query_params.get("user_id")

        # Validate input
        if not workspace_id or not user_id:
            return Response(
                {"error": "workspace_id and user_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Check if user is a member
        is_member = WorkspaceMember.objects.filter(
            workspace=workspace, user_id=user_id
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
        workspaces = Workspace.objects.all().values("workspace_id", "name")
        return Response(list(workspaces))
