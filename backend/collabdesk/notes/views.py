from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from collabdesk.permissions import Auth0Authentication
from .models import Note
from users.models import User
from uuid import UUID
from .serializers import NoteSerializer
from workspaces.models import WorkspaceMember


class NoteListCreateView(APIView):
    authentication_classes = [Auth0Authentication]

    def post(self, request):
        user = request.user
        data = request.data

        if "workspace" not in data:
            return Response({"error": "workspace is required"}, status=400)

        serializer = NoteSerializer(data=data)

        if serializer.is_valid():
            serializer.save(owner=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NoteListByWorkspaceView(APIView):
    authentication_classes = [Auth0Authentication]

    def get(self, request):
        user = request.user
        workspace_id = request.query_params.get("workspace_id")

        if not workspace_id:
            return Response({"error": "workspace_id is required"}, status=400)

        notes = Note.objects.filter(owner=user, workspace_id=workspace_id).order_by(
            "-created_at"
        )

        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data, status=200)


class NoteDeleteView(APIView):
    authentication_classes = [Auth0Authentication]

    def delete(self, request, note_id):
        user = request.user
        try:
            note = Note.objects.get(id=note_id, owner=user)
        except Note.DoesNotExist:
            return Response({"error": "Note not found"}, status=404)

        note.delete()
        return Response({"message": "Note deleted"}, status=204)


class NoteUpdateView(APIView):
    authentication_classes = [Auth0Authentication]

    def put(self, request, note_id):
        user = request.user

        try:
            note = Note.objects.get(id=note_id, owner=user)
        except Note.DoesNotExist:
            return Response({"error": "Note not found"}, status=404)

        serializer = NoteSerializer(note, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)

        return Response(serializer.errors, status=400)

class ShareNoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        note = get_object_or_404(Note, pk=pk)

        # Only owner can share
        if note.owner != request.user:
            return Response(
                {"error": "Only the owner can share this note."},
                status=status.HTTP_403_FORBIDDEN,
            )

        member_ids = request.data.get("ids", [])
        if not isinstance(member_ids, list):
            return Response(
                {"error": "ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    
            # 1️⃣ Resolve incoming IDs → users_user.id
        try:
            resolved_users = User.objects.filter(user_id__in=member_ids)
            resolved_user_ids = list(resolved_users.values_list("id", flat=True))

        except Exception:
            return Response(
                {"error": "Invalid user ids"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(resolved_user_ids) != len(member_ids):
            return Response(
                {"error": "One or more users do not exist"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace_user_ids = set(
            WorkspaceMember.objects.filter(
                workspace=note.workspace,
                is_active=True,
                user_id__in=resolved_user_ids,
            ).values_list("user_id", flat=True)
        )

        if len(workspace_user_ids) != len(resolved_user_ids):
            return Response(
                {"error": "One or more users are not part of this workspace"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note.shared_with.set(workspace_user_ids)
        note.is_shared = len(workspace_user_ids) > 0
        note.save()
        note.refresh_from_db()

        return Response(NoteSerializer(note).data, status=status.HTTP_200_OK)

class SharedNotesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        workspace_id = request.query_params.get("workspace_id")

        if not workspace_id:
            return Response(
                {"detail": "workspace_id query param is required"}, status=400
            )

        # Fetch shared notes belonging to that workspace AND shared with user
        notes = Note.objects.filter(
            workspace_id=workspace_id, is_shared=True, shared_with=user
        ).exclude(owner=user)

        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)
