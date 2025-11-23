import uuid
import datetime
import pytz
from datetime import timedelta

from django.utils import timezone
from django.test import TestCase
from .models import Event, EventParticipant
from workspaces.models import Workspace, WorkspaceMember
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import override_settings
from django.conf import settings
from unittest.mock import patch, MagicMock
from rest_framework import status
from .serializers import EventSerializer
from .views import RecommendTimeSlots


def createDefaultEvent():
    e_uuid = uuid.uuid4()
    User = get_user_model()
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = User.objects.create(username=username, email=f"{username}@test.com")

    workspace = Workspace.objects.create(
        name="CollabDesk Workspace",
        description="Main workspace for CollabDesk project",
        created_by=user,
    )

    # Create workspace membership for the user
    WorkspaceMember.objects.create(workspace=workspace, user=user, is_active=True)

    created_at = timezone.now()
    updated_at = created_at
    start_time = created_at + datetime.timedelta(hours=1)
    end_time = start_time + datetime.timedelta(hours=1)
    event_type = "GROUP"
    location = "School"
    event = Event.objects.create(
        event_id=e_uuid,
        title="Meeting",
        description="test",
        start_time=start_time,
        end_time=end_time,
        event_type=event_type,
        location=location,
        created_by=user,
        workspace=workspace,
        created_at=created_at,
        updated_at=updated_at,
    )

    return event


def createEventWithCunstomizedTime(created_at, updated_at, start_time, end_time):
    e_uuid = uuid.uuid4()
    User = get_user_model()
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = User.objects.create(username=username, email=f"{username}@test.com")

    workspace = Workspace.objects.create(
        name="CollabDesk Workspace",
        description="Main workspace for CollabDesk project",
        created_by=user,
    )

    # Create workspace membership for the user
    WorkspaceMember.objects.create(workspace=workspace, user=user, is_active=True)

    event_type = "GROUP"
    location = "School"
    event = Event.objects.create(
        event_id=e_uuid,
        title="Meeting",
        description="test",
        start_time=start_time,
        end_time=end_time,
        event_type=event_type,
        location=location,
        created_by=user,
        workspace=workspace,
        created_at=created_at,
        updated_at=updated_at,
    )

    return event


class EventModelTests(TestCase):
    def test_create_event_and_str_method(self):
        event = createDefaultEvent()
        self.assertEqual(str(event), event.title)


@override_settings(SECURE_SSL_REDIRECT=False)
class EventAPITests(TestCase):
    def setUp(self):
        self.event = createDefaultEvent()
        self.user = self.event.created_by
        self.workspace = self.event.workspace

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.url = reverse("events:event-list")  # /api/events/

    def test_post_create_event(self):
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(hours=2)
        end_time = start_time + datetime.timedelta(hours=1)

        payload = {
            "title": "New Test Event",
            "description": "Testing POST creation",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": "GROUP",
            "location": "Library",
        }

        # Send POST request with workspace context header
        response = self.client.post(
            self.url,
            payload,
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        # Assertions
        self.assertEqual(response.status_code, 201)

    def test_creator_is_attendee_on_create(self):
        """When a user creates an event, they should be present in attendees."""
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(hours=2)
        end_time = start_time + datetime.timedelta(hours=1)

        payload = {
            "title": "Creator Attendee Event",
            "description": "Creator should be attendee",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": "GROUP",
            "location": "Lobby",
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        self.assertEqual(response.status_code, 201)

        # Fetch the created event and assert creator is listed in attendees_detail
        event_id = response.data.get("event_id") or response.data.get("id")
        self.assertIsNotNone(event_id)

        detail_url = reverse("events:event-detail", args=[event_id])
        detail_resp = self.client.get(
            detail_url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        self.assertEqual(detail_resp.status_code, 200)
        attendees = detail_resp.data.get("attendees_detail", [])
        attendee_ids = {a.get("id") for a in attendees}
        self.assertIn(self.user.id, attendee_ids)

    def test_get_with_event_id_uuid(self):
        event = createDefaultEvent()
        client = APIClient()
        client.force_authenticate(user=event.created_by)

        url = reverse("events:event-detail", args=(event.event_id,))
        response = client.get(
            url, follow=True, HTTP_X_WORKSPACE_ID=str(event.workspace.workspace_id)
        )
        self.assertEqual(response.status_code, 200)

    def test_get_without_event_id_uuid(self):
        event = createDefaultEvent()
        client = APIClient()
        client.force_authenticate(user=event.created_by)

        url = reverse("events:event-list")
        response = client.get(
            url, follow=True, HTTP_X_WORKSPACE_ID=str(event.workspace.workspace_id)
        )
        self.assertEqual(response.status_code, 200)

    def test_create_and_delete_event(self):
        event = createDefaultEvent()
        client = APIClient()
        client.force_authenticate(user=event.created_by)

        url = reverse("events:event-detail", args=(event.event_id,))
        response = client.delete(
            url, HTTP_X_WORKSPACE_ID=str(event.workspace.workspace_id)
        )
        self.assertEqual(response.status_code, 204)

    def test_create_overlap_event(self):
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(days=1, hours=1)
        end_time = created_at + datetime.timedelta(days=1, hours=3)

        payload1 = {
            "title": "Test Event 1",
            "description": "First event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": "INDIVIDUAL",
            "location": "Library",
        }

        url = reverse("events:event-list")
        response1 = self.client.post(
            url,
            payload1,
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        start_time = created_at + datetime.timedelta(days=1, hours=2)
        end_time = created_at + datetime.timedelta(days=1, hours=3)

        payload2 = {
            "title": "Test Event 2",
            "description": "Overlapping event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": "INDIVIDUAL",
            "location": "Library",
        }

        response2 = self.client.post(
            url,
            payload2,
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response1.status_code, 201)
        self.assertEqual(response2.status_code, 409)

    def test_user_event_list_only_returns_user_events(self):
        """GET /api/events/user/ should return only events created by the
        authenticated user."""
        # Create another event by a different user
        other_event = createDefaultEvent()

        url = reverse("events:userEvent-detail")
        response = self.client.get(url, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

        # There should be exactly one event (the one created in setUp)
        self.assertEqual(len(response.data), 1)

        # The returned event's created_by must match the authenticated user
        returned_created_by = response.data[0].get("created_by")
        self.assertEqual(returned_created_by, self.user.id)

    def test_recommend_slots_basic(self):
        """Test basic time slot recommendations with no existing events"""
        tomorrow = (timezone.now() + datetime.timedelta(days=1)).date()
        url = reverse("events:recommend-slots", args=[tomorrow.isoformat(), 60])

        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("recommended_slots", response.data)
        self.assertEqual(len(response.data["recommended_slots"]), 3)

        # Verify we get one slot from each period
        periods = set()
        for slot in response.data["recommended_slots"]:
            self.assertIn("start_time", slot)
            self.assertIn("end_time", slot)
            self.assertIn("period", slot)
            periods.add(slot["period"])

        self.assertEqual(periods, {"morning", "early_afternoon", "late_afternoon"})

    def test_recommend_slots_with_conflicts(self):
        """Test recommendations when there are existing events"""
        tomorrow = timezone.now() + datetime.timedelta(days=1)
        tomorrow_date = tomorrow.date()

        # Create an event from 10:00 to 12:00 tomorrow
        event_start = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        event_end = event_start + datetime.timedelta(hours=2)

        createEventWithCunstomizedTime(
            created_at=timezone.now(),
            updated_at=timezone.now(),
            start_time=event_start,
            end_time=event_end,
        )

        url = reverse("events:recommend-slots", args=[tomorrow_date.isoformat(), 60])

        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("recommended_slots", response.data)

        # Verify none of the recommended slots overlap with our existing event
        for slot in response.data["recommended_slots"]:
            slot_start = datetime.datetime.fromisoformat(slot["start_time"])
            slot_end = datetime.datetime.fromisoformat(slot["end_time"])

            self.assertFalse(
                (slot_start < event_end and slot_end > event_start),
                "Recommended slot overlaps with existing event",
            )

    def test_recommend_considers_creator_conflict(self):
        """Creator's existing events should be considered when recommending slots."""
        tomorrow = timezone.now() + datetime.timedelta(days=1)
        tz = pytz.timezone(settings.TIME_ZONE)
        day = timezone.localtime(tomorrow, tz).date()

        # Create an event for the authenticated user from 09:00 to 10:00
        start_local = tz.localize(datetime.datetime.combine(day, datetime.time(9, 0)))
        end_local = start_local + datetime.timedelta(hours=1)

        Event.objects.create(
            title="Creator Busy",
            description="Creator has meeting",
            start_time=start_local,
            end_time=end_local,
            event_type="GROUP",
            location="Desk",
            created_by=self.user,
            workspace=self.workspace,
        )

        url = reverse("events:recommend-slots", args=[day.isoformat(), 60])
        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("recommended_slots", response.data)

        # Find morning slot and assert it starts at or after 10:00 local time
        morning = next(
            (
                s
                for s in response.data["recommended_slots"]
                if s.get("period") == "morning"
            ),
            None,
        )
        self.assertIsNotNone(morning)
        start = datetime.datetime.fromisoformat(morning["start_time"])  # aware
        start_local = start.astimezone(tz)
        self.assertGreaterEqual(start_local.hour, 10)

    def test_recommend_slots_invalid_date(self):
        """Test recommendations with invalid date format"""
        url = reverse("events:recommend-slots", args=["invalid-date", 60])

        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertIn("Invalid date format", response.data["error"])

    def test_recommend_slots_invalid_duration(self):
        """Test recommendations with invalid duration"""
        tomorrow = (timezone.now() + datetime.timedelta(days=1)).date()

        # Test with zero duration
        url = reverse("events:recommend-slots", args=[tomorrow.isoformat(), 0])
        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertIn("Duration must be positive", response.data["error"])

        # Test with very long duration that won't fit in working hours
        url = reverse("events:recommend-slots", args=[tomorrow.isoformat(), 1000])
        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data.get("recommended_slots", [])), 0)
        self.assertIn("message", response.data)
        self.assertIn("No available time slots found", response.data["message"])

    def test_recommend_slots_without_workspace(self):
        """Test recommendations without workspace context"""
        tomorrow = (timezone.now() + datetime.timedelta(days=1)).date()
        url = reverse("events:recommend-slots", args=[tomorrow.isoformat(), 60])

        response = self.client.get(url, follow=True)  # No workspace header

        self.assertEqual(response.status_code, 403)
        self.assertIn("error", response.data)
        self.assertIn("Workspace context required", response.data["error"])


@override_settings(SECURE_SSL_REDIRECT=False)
class EventParticipantModelTest(TestCase):
    def test_create_event_participant_and_str_method(self):
        event = createDefaultEvent()
        user = event.created_by
        added_at = timezone.now()
        User = get_user_model()
        username = f"user_{uuid.uuid4().hex[:8]}"
        user2 = User.objects.create(username=username, email=f"{username}@test.com")

        payload = {
            "added_at": added_at.isoformat(),
            "status": "Test event participant",
            "added_by": user.id,
            "event": event.event_id,
            "user": user2.id,
        }
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        url = reverse("events:participant-list")
        response = self.client.post(url, payload, format="json", follow=True)

        self.assertEqual(response.status_code, 201)


class WorkspaceMembersAPITests(TestCase):
    def setUp(self):
        self.User = get_user_model()

    def test_workspace_members_list_success(self):
        # Create owner and another member
        owner = self.User.objects.create(username="owner", email="owner@test.com")
        member = self.User.objects.create(username="member", email="member@test.com")

        workspace = Workspace.objects.create(
            name="Team Workspace",
            description="Test workspace",
            created_by=owner,
        )

        # Add memberships
        WorkspaceMember.objects.create(
            workspace=workspace, user=owner, role="owner", is_active=True
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=member, role="member", is_active=True
        )

        client = APIClient()
        client.force_authenticate(user=owner)

        url = reverse("events:workspace-members")
        response = client.get(url, HTTP_X_WORKSPACE_ID=str(workspace.workspace_id))

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
        # Expect two members
        self.assertEqual(len(response.data), 2)

        usernames = {m["username"] for m in response.data}
        self.assertIn("owner", usernames)
        self.assertIn("member", usernames)

    def test_workspace_members_non_member_forbidden(self):
        owner = self.User.objects.create(username="owner2", email="owner2@test.com")
        outsider = self.User.objects.create(
            username="outsider", email="outsider@test.com"
        )

        workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Test workspace",
            created_by=owner,
        )

        WorkspaceMember.objects.create(
            workspace=workspace, user=owner, role="owner", is_active=True
        )

        client = APIClient()
        client.force_authenticate(user=outsider)

        url = reverse("events:workspace-members")
        response = client.get(url, HTTP_X_WORKSPACE_ID=str(workspace.workspace_id))

        self.assertEqual(response.status_code, 403)


class EventAPINegativeAndEdgeTests(TestCase):
    def setUp(self):
        # Reuse helper to get a baseline event, user, workspace
        self.base_event = createDefaultEvent()
        self.user = self.base_event.created_by
        self.workspace = self.base_event.workspace

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_post_create_event_without_workspace_header_forbidden(self):
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(hours=2)
        end_time = start_time + datetime.timedelta(hours=1)

        payload = {
            "title": "No WS Header Event",
            "description": "Should be forbidden",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_type": "GROUP",
            "location": "Library",
        }

        url = reverse("events:event-list")
        # No workspace header provided
        response = self.client.post(url, payload, format="json", follow=True)

        self.assertEqual(response.status_code, 403)

    def test_list_events_across_user_workspaces_without_header(self):
        """When no workspace header is provided, list should aggregate
        events across all workspaces the user belongs to."""
        # Create another workspace and add membership for the same user
        other_ws = Workspace.objects.create(
            name="Second WS", description="Two", created_by=self.user
        )
        WorkspaceMember.objects.create(
            workspace=other_ws, user=self.user, is_active=True
        )

        # Create one more event in the other workspace by the same user
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(days=1, hours=1)
        end_time = start_time + datetime.timedelta(hours=1)
        Event.objects.create(
            title="WS2 Event",
            description="e2",
            start_time=start_time,
            end_time=end_time,
            event_type="GROUP",
            location="Room B",
            created_by=self.user,
            workspace=other_ws,
        )

        url = reverse("events:event-list")
        response = self.client.get(url, follow=True)  # No header

        self.assertEqual(response.status_code, 200)
        # Should at least include both events created above across 2 workspaces
        self.assertGreaterEqual(len(response.data), 2)

        # Sanity check that titles we created are present
        titles = {e.get("title") for e in response.data}
        self.assertIn(self.base_event.title, titles)
        self.assertIn("WS2 Event", titles)

    def test_update_event_title_success(self):
        url = reverse("events:event-detail", args=(self.base_event.event_id,))
        new_title = "Updated Meeting Title"
        response = self.client.patch(
            url,
            {"title": new_title},
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        self.assertEqual(response.status_code, 200)
        self.base_event.refresh_from_db()
        self.assertEqual(self.base_event.title, new_title)

    def test_update_event_other_user_not_member_404(self):
        # Create a different user (not a member of the event's workspace)
        OtherUser = get_user_model()
        other = OtherUser.objects.create(
            username=f"other_{uuid.uuid4().hex[:8]}", email="other@test.com"
        )

        client = APIClient()
        client.force_authenticate(user=other)

        url = reverse("events:event-detail", args=(self.base_event.event_id,))
        # Even if header includes workspace id, membership is missing so queryset excludes event
        response = client.patch(
            url,
            {"title": "Try Update"},
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        # Not found (cannot access object outside user's workspaces)
        self.assertEqual(response.status_code, 404)

    def test_group_events_can_overlap(self):
        created_at = timezone.now()
        start_time = created_at + datetime.timedelta(days=1, hours=10)
        end_time = start_time + datetime.timedelta(hours=2)

        # First create an INDIVIDUAL event at 10-12
        Event.objects.create(
            title="Indv",
            description="First",
            start_time=start_time,
            end_time=end_time,
            event_type="INDIVIDUAL",
            location="L1",
            created_by=self.user,
            workspace=self.workspace,
        )

        # Now try to create a GROUP event that overlaps 11-12 (should be allowed)
        payload = {
            "title": "Group Overlap",
            "description": "Overlap allowed for GROUP",
            "start_time": (start_time + datetime.timedelta(hours=1)).isoformat(),
            "end_time": (start_time + datetime.timedelta(hours=2)).isoformat(),
            "event_type": "GROUP",
            "location": "L2",
        }
        url = reverse("events:event-list")
        response = self.client.post(
            url,
            payload,
            format="json",
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        self.assertEqual(response.status_code, 201)


class EventParticipantModelBehaviorTests(TestCase):
    def test_save_auto_assign_user_from_added_by_when_missing(self):
        event = createDefaultEvent()
        added_by = event.created_by

        participant = EventParticipant(
            event=event,
            added_by=added_by,
            # Intentionally omit `user` to exercise save() defaulting logic
        )
        participant.save()
        self.assertEqual(participant.user, added_by)


class WorkspaceMembersAuthTests(TestCase):
    def test_workspace_members_requires_authentication(self):
        # Prepare a workspace and owner, but do NOT authenticate the request
        User = get_user_model()
        owner = User.objects.create(username="ownna", email="ownna@test.com")
        ws = Workspace.objects.create(
            name="WS-Auth", description="desc", created_by=owner
        )
        WorkspaceMember.objects.create(workspace=ws, user=owner, is_active=True)

        client = APIClient()  # unauthenticated client
        url = reverse("events:workspace-members")
        resp = client.get(url, HTTP_X_WORKSPACE_ID=str(ws.workspace_id))
        # Current view returns 403 when workspace context/auth invalid for this endpoint
        self.assertEqual(resp.status_code, 403)


class RecommendSlotsEdgeCasesTests(TestCase):
    def setUp(self):
        self.event = createDefaultEvent()
        self.user = self.event.created_by
        self.workspace = self.event.workspace
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_recommend_slots_multiday_overlap(self):
        """An event from previous day to this morning should block morning slots until it ends."""
        # Work entirely in the local timezone to avoid UTC/local confusion
        tz = pytz.timezone(settings.TIME_ZONE)
        base_local = timezone.localtime(timezone.now() + datetime.timedelta(days=2), tz)
        day = base_local.date()
        # Build local-aware datetimes: prev day 23:00 -> today 09:00
        prev_day_date = day - datetime.timedelta(days=1)
        prev_day = tz.localize(
            datetime.datetime.combine(prev_day_date, datetime.time(23, 0))
        )
        end_morning = tz.localize(datetime.datetime.combine(day, datetime.time(9, 0)))

        # Create overlapping event IN THE SAME WORKSPACE so it is considered
        Event.objects.create(
            title="Overnight",
            description="prev-day to morning",
            start_time=prev_day,
            end_time=end_morning,
            event_type="GROUP",
            location="R",
            created_by=self.user,
            workspace=self.workspace,
        )

        url = reverse("events:recommend-slots", args=[day.isoformat(), 60])
        response = self.client.get(
            url,
            follow=True,
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("recommended_slots", response.data)

        # Find morning slot and assert it starts at or after 09:00
        morning = next(
            (
                s
                for s in response.data["recommended_slots"]
                if s.get("period") == "morning"
            ),
            None,
        )
        self.assertIsNotNone(morning)
        start = datetime.datetime.fromisoformat(morning["start_time"])  # aware
        # Convert to local tz for comparison
        start_local = start.astimezone(tz)
        self.assertGreaterEqual(start_local.hour, 9)

class EventCoverageTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            full_name="Test User"
        )
        self.client.force_authenticate(user=self.user)
        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            created_by=self.user
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role="admin"
        )
        self.workspace_header = {"HTTP_X_WORKSPACE_ID": str(self.workspace.workspace_id)}

    def test_event_participant_save_default_user(self):
        """Test that EventParticipant defaults user to added_by if not set."""
        event = Event.objects.create(
            title="Test Event",
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            created_by=self.user,
            workspace=self.workspace
        )
        participant = EventParticipant(
            event=event,
            added_by=self.user,
            status="invited"
        )
        participant.save()
        self.assertEqual(participant.user, self.user)

    def test_serializer_created_by_name_none(self):
        """Test EventSerializer get_created_by_name when created_by is None."""
        # Mock an object that behaves like an Event but has created_by = None
        mock_event = MagicMock()
        mock_event.created_by = None
        
        serializer = EventSerializer()
        result = serializer.get_created_by_name(mock_event)
        self.assertIsNone(result)

    def test_serializer_to_representation_exception(self):
        """Test EventSerializer to_representation handles exception in get_attendees_detail."""
        event = Event.objects.create(
            title="Test Event",
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            created_by=self.user,
            workspace=self.workspace
        )
        
        # We need to mock get_attendees_detail to raise exception
        # BUT super().to_representation also calls it.
        # So we mock super().to_representation to return basic data
        # and then let our to_representation call get_attendees_detail which raises exception.
        
        with patch('rest_framework.serializers.ModelSerializer.to_representation') as mock_super:
            mock_super.return_value = {"id": event.event_id}
            with patch.object(EventSerializer, 'get_attendees_detail', side_effect=Exception("Test Error")):
                serializer = EventSerializer(event)
                data = serializer.to_representation(event)
                # attendees_detail should not be in data
                self.assertNotIn("attendees_detail", data)

    def test_serializer_validate_no_request(self):
        """Test EventSerializer validate without request in context."""
        serializer = EventSerializer(data={})
        # It should just return data without validation errors related to request
        # We need to pass some data to validate
        data = {
            "title": "Test",
            "start_time": timezone.now(),
            "end_time": timezone.now() + timedelta(hours=1),
            "event_type": "GROUP"
        }
        # We are testing the validate method directly or via is_valid
        serializer = EventSerializer(data=data) # No context
        # It will fail on required fields if we don't provide them, but we want to hit the `if not request: return data`
        # The validate method is called during is_valid()
        # Since we didn't provide context={'request': ...}, it should hit that line.
        # However, ModelSerializer validation might fail on other things first.
        # Let's just call validate directly.
        serializer = EventSerializer()
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_serializer_create_attendees_mixed(self):
        """Test EventSerializer create with mixed attendee types (int and uuid string)."""
        User = get_user_model()
        user2 = User.objects.create_user(username="u2", email="u2@test.com", password="pw")
        user3 = User.objects.create_user(username="u3", email="u3@test.com", password="pw")
        
        # Use a valid UUID that doesn't exist
        non_existent_uuid = str(uuid.uuid4())
        
        data = {
            "title": "Test Event",
            "start_time": timezone.now(),
            "end_time": timezone.now() + timedelta(hours=1),
            "event_type": "GROUP",
            "attendees": [str(user2.id), str(user3.user_id), non_existent_uuid]
        }
        
        # We need request in context for create
        request = MagicMock()
        request.user = self.user
        request.workspace = self.workspace
        
        serializer = EventSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            event = serializer.save(workspace=self.workspace, created_by=self.user)
            self.assertEqual(event.attendees.count(), 2) # user2 and user3
        else:
            self.fail(f"Serializer not valid: {serializer.errors}")

    def test_view_perform_create_exception(self):
        """Test EventListCreateView perform_create handles exception during participant creation."""
        data = {
            "title": "Test Event",
            "start_time": timezone.now(),
            "end_time": timezone.now() + timedelta(hours=1),
            "event_type": "GROUP"
        }
        
        # Mock EventParticipant.objects.get_or_create to raise exception
        # Also mock logger to prevent error output during test
        with patch('events.models.EventParticipant.objects.get_or_create', side_effect=Exception("DB Error")):
            with patch('events.views.logger') as mock_logger:
                response = self.client.post('/api/events/', data, **self.workspace_header)
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                # The event should still be created
                self.assertEqual(Event.objects.count(), 1)
                # Verify exception was logged
                mock_logger.exception.assert_called()

    def test_recommend_time_slots_unexpected_exception(self):
        """Test RecommendTimeSlots handles unexpected exceptions."""
        url = f"/api/events/recommend-slots/{timezone.now().date()}/60/"
        
        with patch('events.views.RecommendTimeSlots._parse_date', side_effect=Exception("Unexpected")):
            with patch('events.views.logger') as mock_logger:
                response = self.client.get(url, **self.workspace_header)
                self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                mock_logger.error.assert_called()

    def test_recommend_time_slots_invalid_attendees(self):
        """Test RecommendTimeSlots with invalid attendee strings."""
        # This covers _resolve_attendee_part returning None
        date_str = timezone.now().date().isoformat()
        url = f"/api/events/recommend-slots/{date_str}/60/?attendees=invalid,123,test@example.com"
        
        # 123 might not exist, test@example.com exists (self.user)
        # invalid should be ignored
        
        response = self.client.get(url, **self.workspace_header)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_workspace_members_exception(self):
        """Test WorkspaceMembersView handles exceptions."""
        url = f"/api/events/workspace/members/"
        
        with patch('workspaces.models.WorkspaceMember.objects.filter', side_effect=Exception("DB Error")):
            with patch('events.views.logger') as mock_logger:
                response = self.client.get(url, **self.workspace_header)
                self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                mock_logger.error.assert_called()

    def test_resolve_attendee_part_exception(self):
        """Test _resolve_attendee_part handles exception during user lookup."""
        view = RecommendTimeSlots()
        with patch('django.contrib.auth.get_user_model') as mock_get_user_model:
            mock_User = MagicMock()
            mock_get_user_model.return_value = mock_User
            mock_User.objects.filter.side_effect = Exception("DB Error")
            
            result = view._resolve_attendee_part("test@example.com")
            self.assertIsNone(result)

    def test_get_existing_events_no_attendees(self):
        """Test _get_existing_events with no attendee_ids."""
        view = RecommendTimeSlots()
        # We need to mock Event.objects.filter
        with patch('events.models.Event.objects.filter') as mock_filter:
            mock_qs = MagicMock()
            mock_filter.return_value = mock_qs
            mock_qs.filter.return_value = mock_qs
            
            view._get_existing_events(self.workspace, timezone.now(), timezone.now(), [])
            
            # Should call order_by on base_qs, not filter with Q
            # The code: return base_qs.order_by("start_time")
            mock_qs.order_by.assert_called_with("start_time")
