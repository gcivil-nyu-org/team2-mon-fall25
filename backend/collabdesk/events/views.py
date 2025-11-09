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

        serializer.save(workspace=self.request.workspace, created_by=self.request.user)


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
        that don't conflict with existing events.
        """
        try:
            # Parse the date
            try:
                # Parse the date and make it timezone-aware
                naive_date = datetime.strptime(event_date, "%Y-%m-%d")
                # Create base date in the current timezone
                base_date = timezone.localtime(timezone.make_aware(naive_date))
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"},
                    status=400
                )

            # Validate duration
            if duration <= 0:
                return Response(
                    {"error": "Duration must be positive"},
                    status=400
                )

            # Set working hours bounds in the current timezone
            work_start = base_date.replace(hour=8, minute=0, second=0, microsecond=0)
            work_end = base_date.replace(hour=17, minute=0, second=0, microsecond=0)

            # Parse parameters
            # Get workspace context
            if not hasattr(request, "workspace") or not request.workspace:
                    return Response(
                        {"error": "Workspace context required. Please provide X-Workspace-ID header."},
                        status=403
                    )

                # Get all events in the workspace for the day
            existing_events = Event.objects.filter(
                workspace=request.workspace,
                start_time__date=base_date.date(),
            ).order_by('start_time')

            # Convert duration to timedelta
            duration_delta = timedelta(minutes=duration)

            # Define three time periods for better distribution
            morning_start = work_start
            morning_end = base_date.replace(hour=11, minute=0, second=0, microsecond=0)
            early_afternoon_start = base_date.replace(hour=11, minute=0, second=0, microsecond=0)
            early_afternoon_end = base_date.replace(hour=14, minute=0, second=0, microsecond=0)
            late_afternoon_start = base_date.replace(hour=14, minute=0, second=0, microsecond=0)
            late_afternoon_end = work_end

            periods = [
                (morning_start, morning_end, "morning"),
                (early_afternoon_start, early_afternoon_end, "early_afternoon"),
                (late_afternoon_start, late_afternoon_end, "late_afternoon")
            ]

            recommendations = []
            
            # Try to get one recommendation from each period
            for period_start, period_end, period_name in periods:
                current_slot = period_start
                
                while current_slot + duration_delta <= period_end:
                    slot_end = current_slot + duration_delta
                    
                    # Check if this slot conflicts with any existing events
                    has_conflict = False
                    for event in existing_events:
                        if (current_slot < event.end_time and 
                            slot_end > event.start_time):
                            has_conflict = True
                            break
                    
                    if not has_conflict:
                        recommendations.append({
                            'start_time': current_slot.isoformat(),
                            'end_time': slot_end.isoformat(),
                            'period': period_name
                        })
                        break  # Found a slot for this period, move to next period
                    
                    # Move to next 30-minute slot within this period
                    current_slot += timedelta(minutes=30)

            if not recommendations:
                return Response({
                    "message": "No available time slots found for the specified date and duration during working hours (8:00-17:00)"
                })

            return Response({
                "recommended_slots": recommendations
            })

        except Exception as e:
            logger.error(f"Error generating time slot recommendations: {str(e)}")
            return Response(
                {"error": "An error occurred while generating recommendations"},
                status=500
            )
