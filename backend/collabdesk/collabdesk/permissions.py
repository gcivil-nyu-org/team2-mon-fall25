"""
Django REST Framework Authentication and Permissions for Auth0
"""

from rest_framework import authentication, permissions
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
from .auth import get_token_validator
import logging


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
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed(
                "Invalid authorization header format. Expected: Bearer <token>"
            )

        token = parts[1]

        # Initialize logger first
        logger = logging.getLogger(__name__)

        # Validate the token
        try:
            validator = get_token_validator()
            payload = validator.validate_token(token)
        except ValueError as e:
            raise AuthenticationFailed(str(e))

        # Extract user info from token
        auth0_sub = payload.get("sub")
        email = payload.get("email") or payload.get(f"{settings.AUTH0_DOMAIN}/email")
        name = payload.get("name") or payload.get(f"{settings.AUTH0_DOMAIN}/name") or ""
        picture = payload.get("picture") or payload.get(f"{settings.AUTH0_DOMAIN}/picture") or ""

        # If user info is not in token, fetch it from Auth0 userinfo endpoint
        if not email or not name:
            try:
                user_info = validator.get_user_info(token)
                email = email or user_info.get("email")
                name = name or user_info.get("name", "")
                picture = picture or user_info.get("picture", "")
                logger.info(f"Fetched user info from Auth0 userinfo endpoint: {user_info}")
            except ValueError as e:
                logger.warning(f"Failed to fetch user info: {e}")

        # Log payload for debugging (remove in production)
        logger.info(f"Auth0 Token Payload: {payload}")
        logger.info(f"Extracted - sub: {auth0_sub}, email: {email}, name: {name}, picture: {picture}")

        if not auth0_sub:
            raise AuthenticationFailed("Token missing user identifier (sub)")

        # Generate email from auth0_sub if not provided
        if not email:
            # Extract email-like identifier from auth0_sub or generate one
            email = f"{auth0_sub.replace('|', '_').replace('auth0', 'user')}@auth0-user.com"
            logger.warning(f"Token missing email, generated: {email}")

        # Get or create user based on Auth0 sub
        user, created = User.objects.get_or_create(
            auth0_sub=auth0_sub,
            defaults={
                "username": email,
                "email": email,
                "full_name": name,
                "profile_picture": picture,
            }
        )

        # Update user info if it changed (only on existing users)
        if not created:
            updated = False
            if email and user.email != email and not user.email.endswith('@placeholder.com'):
                # Only update email if it's not a placeholder and token has real email
                user.email = email
                updated = True
            if email and user.username != email and not user.username.startswith(email.split('@')[0]):
                # Update username to match email for consistency
                user.username = email
                updated = True
            if name and user.full_name != name:
                user.full_name = name
                updated = True
            if picture and user.profile_picture != picture:
                user.profile_picture = picture
                updated = True

            if updated:
                user.save()
                logger.info(f"Updated user: {user.email}")
        else:
            logger.info(f"Created new user: {user.email} with auth0_sub: {auth0_sub}")

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
