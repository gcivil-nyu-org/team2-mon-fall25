from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from collabdesk.permissions import Auth0Authentication
from .models import Note
from .serializers import NoteSerializer


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
