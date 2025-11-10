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

    def _extract_user_info(self, payload, token, logger):
        """Extract user information from token payload"""
        auth0_sub = payload.get("sub")

        # Try multiple possible claim locations for email
        email = (
            payload.get("email")
            or payload.get(f"{settings.AUTH0_DOMAIN}/email")
            or payload.get("https://{}/email".format(settings.AUTH0_DOMAIN))
            or payload.get(
                "https://dev-5s54nlyerhlsnvj1.us.auth0.com/email"
            )  # Fallback to actual domain
        )

        # Try multiple possible claim locations for name
        name = (
            payload.get("name")
            or payload.get(f"{settings.AUTH0_DOMAIN}/name")
            or payload.get("https://{}/name".format(settings.AUTH0_DOMAIN))
            or payload.get("nickname")
            or ""
        )

        # Try multiple possible claim locations for picture
        picture = (
            payload.get("picture")
            or payload.get(f"{settings.AUTH0_DOMAIN}/picture")
            or payload.get("https://{}/picture".format(settings.AUTH0_DOMAIN))
            or ""
        )

        logger.info(f"Auth0 Token Payload keys: {list(payload.keys())}")
        logger.info(
            f"Initial extraction - sub: {auth0_sub}, email: {email}, name: {name}, picture: {picture}"
        )

        # Only fetch from userinfo endpoint as a LAST RESORT if email is still missing
        # This prevents rate limiting issues
        if not email:
            try:
                validator = get_token_validator()
                # Pass auth0_sub to enable caching
                user_info = validator.get_user_info(token, auth0_sub=auth0_sub)
                email = user_info.get("email")
                name = name or user_info.get("name", "")
                picture = picture or user_info.get("picture", "")
                logger.info(
                    f"Fetched missing user info from Auth0 userinfo endpoint: email={email}"
                )
            except ValueError as e:
                # Log the error but continue - we'll generate a placeholder email
                logger.warning(
                    f"Failed to fetch user info from Auth0 (possibly rate limited): {e}"
                )

        if not auth0_sub:
            raise AuthenticationFailed("Token missing user identifier (sub)")

        # Generate email from auth0_sub ONLY if we still don't have one
        if not email:
            email = (
                f"{auth0_sub.replace('|', '_').replace('auth0', 'user')}@auth0-user.com"
            )
            logger.warning(
                f"Token missing email even after userinfo fetch, generated placeholder: {email}"
            )
            logger.warning(f"Full token payload for debugging: {payload}")

        return auth0_sub, email, name, picture

    def _update_user_info(self, user, email, name, picture, logger):
        """Update user information if it has changed"""
        updated = False

        if (
            email
            and user.email != email
            and not user.email.endswith("@placeholder.com")
        ):
            user.email = email
            updated = True

        if (
            email
            and user.username != email
            and not user.username.startswith(email.split("@")[0])
        ):
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

        return updated

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
        logger = logging.getLogger(__name__)

        # Validate the token
        try:
            validator = get_token_validator()
            payload = validator.validate_token(token)
        except ValueError as e:
            raise AuthenticationFailed(str(e))

        # Extract user info from token
        auth0_sub, email, name, picture = self._extract_user_info(
            payload, token, logger
        )

        # Get or create user based on Auth0 sub
        user, created = User.objects.get_or_create(
            auth0_sub=auth0_sub,
            defaults={
                "username": email,
                "email": email,
                "full_name": name,
                "profile_picture": picture,
            },
        )

        # Update user info if it changed (only on existing users)
        if not created:
            self._update_user_info(user, email, name, picture, logger)
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
