from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.response import Response
from collabdesk.permissions import Auth0Authentication
from rest_framework import permissions, status
from .models import User
from django.contrib.auth import get_user_model

# from rest_framework.serializers import ModelSerializer

# Create your views here.


@api_view(["GET"])
@authentication_classes([Auth0Authentication])
def current_user(request):
    """
    Get the current authenticated user's profile information.
    """
    user = request.user

    return Response(
        {
            "user_id": str(user.user_id),
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture,
            "username": user.username,
        }
    )


@api_view(["GET"])
@authentication_classes([Auth0Authentication])
@permission_classes([permissions.IsAuthenticated])
def list_users(request):
    """
    Get list of all users for workspace member selection,
    excluding the current authenticated user.
    """
    current_user = request.user
    users = User.objects.exclude(id=current_user.id).values(
        "user_id", "full_name", "email", "id"
    )

    return Response(list(users), status=status.HTTP_200_OK)
