from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Workspace, WorkspaceMember
from users.models import User
from .serializer import (
    WorkspaceSerializer,
    WorkspaceCreateSerializer,
    WorkspaceJoinSerializer,
    WorkspaceMemberSerializer,
)


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
                "workspace": WorkspaceSerializer(workspace).data,
            },
            status=200,
        )


class WorkspaceMembersListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        try:
            workspace = Workspace.objects.get(workspace_id=workspace_id)
        except Workspace.DoesNotExist:
            return Response({"detail": "Workspace not found"}, status=404)

        members = WorkspaceMember.objects.filter(workspace=workspace)
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data)


class WorkspaceAddMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id):
        user = request.user
        user_ids = request.data.get("user_ids", [])

        # Validate workspace
        try:
            workspace = Workspace.objects.get(workspace_id=workspace_id)
        except Workspace.DoesNotExist:
            return Response({"detail": "Workspace not found"}, status=404)

        # Only owner can add members
        try:
            current_member = WorkspaceMember.objects.get(workspace=workspace, user=user)
            if current_member.role != "owner":
                return Response(
                    {"detail": "Only the owner can add members"}, status=403
                )
        except WorkspaceMember.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this workspace"}, status=403
            )

        added_members = []
        skipped_members = []

        for uid in user_ids:
            try:
                member_user = User.objects.get(user_id=uid)

                # Skip if already a member
                if WorkspaceMember.objects.filter(
                    workspace=workspace, user=member_user
                ).exists():
                    skipped_members.append(uid)
                    continue

                WorkspaceMember.objects.create(
                    workspace=workspace,
                    user=member_user,
                    role="member",
                    invited_by=user,
                    is_active=True,
                )
                added_members.append(uid)

            except User.DoesNotExist:
                skipped_members.append(uid)

        return Response(
            {
                "added": added_members,
                "skipped": skipped_members,
                "detail": "Members added successfully",
            },
            status=200,
        )


class WorkspaceRemoveMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, workspace_id, user_id):
        user = request.user

        # Validate workspace
        try:
            workspace = Workspace.objects.get(workspace_id=workspace_id)
        except Workspace.DoesNotExist:
            return Response({"detail": "Workspace not found"}, status=404)

        # Only owner can remove members
        try:
            current_member = WorkspaceMember.objects.get(workspace=workspace, user=user)
            if current_member.role != "owner":
                return Response(
                    {"detail": "Only the owner can remove members"}, status=403
                )
        except WorkspaceMember.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this workspace"}, status=403
            )

        # Member to remove
        try:
            member = WorkspaceMember.objects.get(
                workspace=workspace, user__user_id=user_id
            )
        except WorkspaceMember.DoesNotExist:
            return Response({"detail": "Member not found in workspace"}, status=404)

        # Cannot remove owner
        if member.role == "owner":
            return Response({"detail": "Owner cannot be removed"}, status=400)

        member.delete()

        return Response({"detail": "Member removed successfully"}, status=200)
