from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import EventSerializer, EventParticipantSerializer
from .models import Event, EventParticipant
from collabdesk.middleware import set_workspace_context
from datetime import datetime, timedelta
from django.utils import timezone
import logging
from rest_framework import status
from workspaces.serializer import WorkspaceMemberSerializer
from workspaces.models import WorkspaceMember

logger = logging.getLogger(__name__)


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter events by workspace context.
        If workspace is provided in header, filter by that workspace.
        Otherwise, return all events for user's workspaces.
        """
        user = self.request.user

        # If workspace context is set, filter by that workspace
        if hasattr(self.request, "workspace") and self.request.workspace:
            logger.info(
                f"Fetching events for user={user.email}, "
                f"workspace={self.request.workspace.name}"
            )
            return Event.objects.filter(workspace=self.request.workspace)

        # Otherwise, return events from all user's workspaces
        logger.info(f"Fetching events from all workspaces for user={user.email}")
        user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
        return Event.objects.filter(workspace_id__in=user_workspaces)

    def perform_create(self, serializer):
        """
        Automatically set workspace and created_by when creating an event.
        """
        # Debug logging
        logger.info("🔍 perform_create called")
        logger.info(f"   User: {self.request.user.email}")
        logger.info(f"   Has workspace attr: {hasattr(self.request, 'workspace')}")
        logger.info(
            f"   Workspace value: {getattr(self.request, 'workspace', 'NOT SET')}"
        )
        logger.info(
            f"   Workspace role: {getattr(self.request, 'workspace_role', 'NOT SET')}"
        )

        # Require workspace context for creating events
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error("❌ Workspace context missing! Raising PermissionDenied")
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        logger.info(
            f"✅ Creating event in workspace={self.request.workspace.name}, "
            f"user={self.request.user.email}"
        )

        event = serializer.save(workspace=self.request.workspace, created_by=self.request.user)

        # Ensure the creator is always listed as an attendee so frontend
        # can consistently treat the creator as part of the event's participants.
        # Use the through model `EventParticipant` to create the relation explicitly
        # (calling `event.attendees.add()` may fail when a custom through model
        # is defined). Use get_or_create to avoid duplicates.
        try:
            EventParticipant.objects.get_or_create(
                event=event,
                user=self.request.user,
                defaults={"added_by": self.request.user, "status": "accepted"},
            )
        except Exception:
            # If for some reason the through model cannot be created, log but
            # don't raise to avoid breaking higher-level flows (e.g., migrations).
            logger.exception("Failed to ensure creator is in event attendees")


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        # After authentication completes, set workspace context
        set_workspace_context(request)

    def get_queryset(self):
        """
        Filter events by workspace context to ensure users can only
        access events from their workspaces.
        """
        user = self.request.user

        # If workspace context is set, use it
        if hasattr(self.request, "workspace") and self.request.workspace:
            return Event.objects.filter(workspace=self.request.workspace)

        # Otherwise, filter by user's workspaces
        user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
        return Event.objects.filter(workspace_id__in=user_workspaces)


class EventParticipantCreateView(generics.ListCreateAPIView):
    queryset = EventParticipant.objects.all()
    serializer_class = EventParticipantSerializer
    permission_classes = [IsAuthenticated]


class EventParticipantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EventParticipant.objects.all()
    serializer_class = EventParticipantSerializer
    permission_classes = [IsAuthenticated]


class UserEventListView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        """
        Return only events created by the requesting user. Also respect
        workspace context when present so this view only exposes events
        from the current workspace (or user's workspaces otherwise).
        """
        user = self.request.user

        return Event.objects.filter(created_by=user)


class RecommendTimeSlots(APIView):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get(self, request, event_date, duration):
        """
        Get 3 recommended time slots for a new group event based on provided date and duration.
        URL parameters:
        - event_date: Date in YYYY-MM-DD format
        - duration: integer representing event duration in minutes

        Returns 3 recommended time slots during working hours (8:00 - 17:00)
        that don't conflict with existing events created by attendees.
        """
        try:
            # Parse the date
            try:
                naive_date = datetime.strptime(event_date, "%Y-%m-%d")
                base_date = timezone.localtime(timezone.make_aware(naive_date))
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"}, status=400
                )

            # Validate duration
            if duration <= 0:
                return Response({"error": "Duration must be positive"}, status=400)

            # Set working hours bounds in the current timezone
            work_start = base_date.replace(hour=8, minute=0, second=0, microsecond=0)
            work_end = base_date.replace(hour=17, minute=0, second=0, microsecond=0)

            if not hasattr(request, "workspace") or not request.workspace:
                return Response(
                    {
                        "error": "Workspace context required. Please provide X-Workspace-ID header."
                    },
                    status=403,
                )

            # Parse optional attendees from query params. Expect comma-separated
            # values which may be user IDs (integers) or emails. If provided,
            # limit conflicts to events that involve any of those users.
            attendees_param = request.query_params.get("attendees")
            attendee_ids = []
            if attendees_param:
                from django.contrib.auth import get_user_model

                User = get_user_model()
                parts = [p.strip() for p in attendees_param.split(",") if p.strip()]
                for p in parts:
                    # try numeric id first
                    try:
                        attendee_ids.append(int(p))
                        continue
                    except Exception:
                        pass

                    # fallback to resolving by email
                    try:
                        u = User.objects.filter(email=p).first()
                        if u:
                            attendee_ids.append(u.id)
                    except Exception:
                        # ignore values we can't resolve
                        continue

            # Always include the requesting user (creator) as an attendee so
            # recommendations won't suggest times that conflict with their own
            # calendar even if the frontend didn't include them in `attendees`.
            try:
                creator_id = getattr(request.user, "id", None)
                if creator_id and creator_id not in attendee_ids:
                    attendee_ids.append(creator_id)
            except Exception:
                pass

            # Build base queryset of events overlapping the working window
            base_qs = (
                Event.objects.filter(workspace=request.workspace)
                .filter(start_time__lt=work_end, end_time__gt=work_start)
            )

            # If attendees were provided, restrict to events that involve any
            # of those attendees (either as an attendee or as the creator).
            if attendee_ids:
                from django.db.models import Q

                existing_events = (
                    base_qs.filter(
                        Q(attendees__in=attendee_ids) | Q(created_by__id__in=attendee_ids)
                    )
                    .distinct()
                    .order_by("start_time")
                )
            else:
                existing_events = base_qs.order_by("start_time")

            # Convert duration to timedelta
            duration_delta = timedelta(minutes=duration)

            recommendations = self._generate_recommendations(
                base_date, duration_delta, existing_events
            )

            if not recommendations:
                return Response(
                    {
                        "message": "No available time slots found for the specified date and duration during working hours (8:00-17:00)"
                    }
                )
            return Response({"recommended_slots": recommendations})
        except Exception as e:
            logger.error(f"Error generating time slot recommendations: {str(e)}")
            return Response(
                {"error": "An error occurred while generating recommendations"},
                status=500,
            )

    def _generate_recommendations(self, base_date, duration_delta, existing_events):
        """Return a list of up to 3 recommended slots (one per period).

        Keeps the logic for constructing periods and searching slots in a
        single place so `get()` can remain a thin orchestrator.
        """
        # working hours
        work_start = base_date.replace(hour=8, minute=0, second=0, microsecond=0)
        work_end = base_date.replace(hour=17, minute=0, second=0, microsecond=0)

        periods = self._build_periods(base_date, work_start, work_end)

        recommendations = []
        for period_start, period_end, period_name in periods:
            slot = self._find_slot_for_period(
                period_start, period_end, duration_delta, existing_events
            )
            if slot:
                start, end = slot
                recommendations.append(
                    {
                        "start_time": start.isoformat(),
                        "end_time": end.isoformat(),
                        "period": period_name,
                    }
                )

        return recommendations

    def _build_periods(self, base_date, work_start, work_end):
        return [
            (
                work_start,
                base_date.replace(hour=11, minute=0, second=0, microsecond=0),
                "morning",
            ),
            (
                base_date.replace(hour=11, minute=0, second=0, microsecond=0),
                base_date.replace(hour=14, minute=0, second=0, microsecond=0),
                "early_afternoon",
            ),
            (
                base_date.replace(hour=14, minute=0, second=0, microsecond=0),
                work_end,
                "late_afternoon",
            ),
        ]

    def _find_slot_for_period(
        self, period_start, period_end, duration_delta, existing_events
    ):
        """Find the first non-conflicting slot within [period_start, period_end].

        Returns a tuple (start, end) if found, otherwise None.
        """
        current_slot = period_start
        while current_slot + duration_delta <= period_end:
            slot_end = current_slot + duration_delta

            # check conflict with any existing event
            conflict = False
            for ev in existing_events:
                # ensure both sides comparable (DB events should be aware)
                if current_slot < ev.end_time and slot_end >= ev.start_time:
                    conflict = True
                    break

            if not conflict:
                return current_slot, slot_end

            current_slot += timedelta(minutes=30)

        return None


class WorkspaceMembersView(APIView):
    """
    Return all active members for a given workspace_id (UUID).

    URL: /api/events/workspace/<workspace_id>/members/

    Only authenticated users who are members of the workspace may query this.
    """

    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Override to set workspace context after DRF authentication."""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get(self, request, workspace_id=None):
        """
        Use the workspace set by `X-Workspace-ID` header (via set_workspace_context).
        This endpoint no longer accepts workspace id in URL and requires the header.
        """
        try:
            # Expect workspace to be set by set_workspace_context (from X-Workspace-ID header)
            if not (hasattr(request, "workspace") and request.workspace):
                return Response(
                    {
                        "detail": "Workspace context required. Please provide X-Workspace-ID header."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            members_qs = WorkspaceMember.objects.filter(
                workspace=request.workspace, is_active=True
            ).select_related("user")

            serializer = WorkspaceMemberSerializer(members_qs, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error fetching workspace members: {e}")
            return Response(
                {"detail": "An error occurred while fetching members."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
