from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Allow everyone to read, but only authors can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:  # GET, HEAD, OPTIONS
            return True
        return obj.author == request.user
