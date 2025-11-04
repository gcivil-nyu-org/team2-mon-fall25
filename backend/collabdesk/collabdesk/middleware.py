"""
Workspace Context Middleware
Extracts workspace_id from request headers and stores it for later processing.
Note: For DRF views, actual authentication happens in the view, not middleware.
"""

import logging
from workspaces.models import WorkspaceMember

logger = logging.getLogger(__name__)


class WorkspaceContextMiddleware:
    """
    Middleware to add workspace context to requests.

    For DRF API views, this just stores the workspace_id header.
    The actual validation happens in the view after DRF authentication.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Initialize workspace context (default to None)
        request.workspace = None
        request.workspace_role = None

        # Extract and store workspace_id from header for later use
        workspace_id = request.headers.get("X-Workspace-ID")
        request.workspace_id_header = workspace_id

        # Debug logging
        logger.info(f"🔍 Middleware called for: {request.method} {request.path}")
        logger.info(f"   X-Workspace-ID header: {workspace_id}")
        logger.info(f"   User at middleware: {getattr(request, 'user', 'Not set yet')}")

        # For API requests, we skip auth check here because DRF authenticates in the view
        # The view will call set_workspace_context() after authentication
        if request.path.startswith("/api/"):
            logger.info("   API request - workspace validation will happen in view")
            response = self.get_response(request)
            return response

        # For non-API requests, try to set workspace context now
        if workspace_id and hasattr(request, "user") and request.user.is_authenticated:
            try:
                logger.info(
                    f"Attempting to set workspace context: "
                    f"user={request.user.email}, workspace_id={workspace_id}"
                )

                # Verify user has access to this workspace
                membership = WorkspaceMember.objects.select_related("workspace").get(
                    workspace_id=workspace_id, user=request.user, is_active=True
                )

                # Attach workspace and role to request
                request.workspace = membership.workspace
                request.workspace_role = (
                    membership.role
                )  # Now a string: 'owner' or 'member'

                logger.info(
                    f"✅ Workspace context set: user={request.user.email}, "
                    f"workspace={membership.workspace.name}, "
                    f"role={membership.role}"
                )

            except WorkspaceMember.DoesNotExist:
                logger.error(
                    f"❌ WORKSPACE MEMBERSHIP NOT FOUND: "
                    f"user={request.user.email} (id={request.user.id}), "
                    f"workspace_id={workspace_id}"
                )
                # workspace remains None - views can handle this
            except Exception as e:
                logger.error(f"❌ Error setting workspace context: {e}", exc_info=True)

        response = self.get_response(request)
        return response


def set_workspace_context(request):
    """
    Helper function to set workspace context after authentication.
    Call this from views after DRF authentication completes.
    """
    workspace_id = getattr(request, "workspace_id_header", None)

    if not workspace_id:
        logger.warning("No X-Workspace-ID header found in request")
        return False

    if not request.user.is_authenticated:
        logger.warning("User not authenticated")
        return False

    try:
        logger.info(
            f"🔍 Setting workspace context: "
            f"user={request.user.email} (ID: {request.user.id}), "
            f"workspace_id={workspace_id}"
        )

        # Verify user has access to this workspace
        membership = WorkspaceMember.objects.select_related("workspace").get(
            workspace_id=workspace_id, user=request.user, is_active=True
        )

        # Attach workspace and role to request
        request.workspace = membership.workspace
        request.workspace_role = membership.role

        logger.info(
            f"✅ Workspace context set: user={request.user.email}, "
            f"workspace={membership.workspace.name}, "
            f"role={membership.role}"
        )
        return True

    except WorkspaceMember.DoesNotExist:
        logger.error(
            f"❌ WORKSPACE MEMBERSHIP NOT FOUND: "
            f"user={request.user.email} (id={request.user.id}), "
            f"workspace_id={workspace_id}"
        )
        return False
    except Exception as e:
        logger.error(f"❌ Error setting workspace context: {e}", exc_info=True)
        return False
