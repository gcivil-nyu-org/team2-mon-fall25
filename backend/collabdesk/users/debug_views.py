"""
Debug endpoint to see what's in the Auth0 token.
Add this to your views temporarily to debug token contents.
"""
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from collabdesk.permissions import Auth0Authentication


@api_view(['GET'])
@authentication_classes([Auth0Authentication])
def debug_token(request):
    """
    Debug endpoint to see Auth0 token payload and user info.
    Temporarily add to urls.py:
    path('api/debug/token/', debug_token, name='debug-token'),
    """
    user = request.user
    payload = getattr(user, 'auth0_payload', {})

    return Response({
        'user_info': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'auth0_sub': user.auth0_sub,
            'full_name': user.full_name,
            'profile_picture': user.profile_picture,
        },
        'token_payload': payload,
        'available_claims': list(payload.keys()) if payload else [],
    })

