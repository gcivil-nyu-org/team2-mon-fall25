from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from collabdesk.permissions import Auth0Authentication

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
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture,
            "username": user.username,
        }
    )
