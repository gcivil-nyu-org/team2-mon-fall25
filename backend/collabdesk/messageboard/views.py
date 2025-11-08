# messageboard/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Message, Reaction
from .serializers import MessageSerializer
from .permissions import IsAuthorOrReadOnly


class MessageListCreateView(generics.ListCreateAPIView):
    queryset = Message.objects.filter(parent=None).order_by("-created_at")
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthorOrReadOnly]


class ReactionToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        message = Message.objects.get(pk=pk)
        reaction_type = request.data.get("emoji") or request.data.get("reaction_type")

        existing = Reaction.objects.filter(
            user=request.user, message=message, reaction_type=reaction_type
        )

        if existing.exists():
            existing.delete()
            return Response({"detail": "Reaction removed."}, status=status.HTTP_200_OK)
        else:
            Reaction.objects.create(
                user=request.user, message=message, reaction_type=reaction_type
            )
            return Response(
                {"detail": "Reaction added."}, status=status.HTTP_201_CREATED
            )
