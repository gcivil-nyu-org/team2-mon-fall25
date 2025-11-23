from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from collabdesk.permissions import Auth0Authentication
from .models import Note
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
        """
        Share a note with multiple workspace members.
        Expected payload:
        {
            "user_ids": ["24", "72", "91"]
        }
        """
        note = get_object_or_404(Note, pk=pk)

        # Ensure logged-in user owns the note
        if note.owner != request.user:
            return Response(
                {"error": "Only the owner can share this note."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Extract user ID list
        user_ids = request.data.get("user_ids", [])
        if not isinstance(user_ids, list):
            return Response({"error": "user_ids must be a list"}, status=400)

        # Get workspace members
        workspace = note.workspace
        workspace_member_ids = set(
            WorkspaceMember.objects.filter(
                workspace=note.workspace,
                is_active=True
                ).values_list("user_id", flat=True)
)


        # Validate: All selected users MUST be workspace members
        for uid in user_ids:
            if int(uid) not in workspace_member_ids:
                return Response(
                    {"error": f"User {uid} is not a member of this workspace"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Save sharing relationships
        note.shared_with.set(user_ids)
        note.is_shared = len(user_ids) > 0
        note.save()

        return Response(NoteSerializer(note).data, status=200)

    def delete(self, request, pk, user_id):
        """Unshare with a specific user"""
        note = get_object_or_404(Note, pk=pk)

        # Only owner can unshare
        if note.owner != request.user:
            return Response(
                {"error": "Only the owner can unshare this note."},
                status=status.HTTP_403_FORBIDDEN
            )

        note.shared_with.remove(user_id)

        # If no more users, mark note as not shared
        if note.shared_with.count() == 0:
            note.is_shared = False
            note.save()

        return Response({"status": "unshared"}, status=200)

class SharedNotesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        workspace_id = request.query_params.get("workspace_id")

        if not workspace_id:
            return Response(
                {"detail": "workspace_id query param is required"},
                status=400
            )

        # Fetch shared notes belonging to that workspace AND shared with user
        notes = Note.objects.filter(
            workspace_id=workspace_id,
            is_shared=True,
            shared_with=user
        ).exclude(owner=user)

        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)
