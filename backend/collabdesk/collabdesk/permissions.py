"""
Django REST Framework Authentication and Permissions for Auth0
"""
from rest_framework import authentication, permissions
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from .auth import get_token_validator


User = get_user_model()


class Auth0Authentication(authentication.BaseAuthentication):
    """
    DRF Authentication class that validates Auth0 JWT tokens
    """

    def authenticate(self, request):
        """
        Authenticate the request and return a tuple of (user, token) or None
        """
        # Extract token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise AuthenticationFailed('Invalid authorization header format. Expected: Bearer <token>')

        token = parts[1]

        # Validate the token
        try:
            validator = get_token_validator()
            payload = validator.validate_token(token)
        except ValueError as e:
            raise AuthenticationFailed(str(e))

        # Extract user info from token
        auth0_user_id = payload.get('sub')
        email = payload.get('email')

        if not auth0_user_id:
            raise AuthenticationFailed('Token missing user identifier (sub)')

        # Get or create user based on Auth0 ID
        # You can customize this logic based on your user model
        user, created = User.objects.get_or_create(
            username=auth0_user_id,
            defaults={'email': email or ''}
        )

        # Store the full token payload on the user object for access in views
        user.auth0_payload = payload

        return (user, token)


class IsAuthenticated(permissions.BasePermission):
    """
    Permission class that requires Auth0 authentication
    """

    def has_permission(self, request, view):
        """
        Return True if the request is authenticated via Auth0
        """
        return request.user and request.user.is_authenticated

