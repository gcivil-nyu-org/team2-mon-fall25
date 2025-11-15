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
    queryset = Message.objects.all().select_related("author")
    serializer_class = MessageSerializer
    permission_classes = [IsAuthorOrReadOnly]


class ReactionToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        message = Message.objects.get(pk=pk)
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
