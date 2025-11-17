from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Allow everyone to read, but only authors can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:  # GET, HEAD, OPTIONS
            return True
        if request.user.is_authenticated:
            return obj.author.auth0_sub == request.user.auth0_sub

        return False
