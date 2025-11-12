import uuid
import datetime

from django.utils import timezone
from django.test import TestCase
from .models import Event, EventParticipant
from workspaces.models import Workspace, WorkspaceMember
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import override_settings


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
        WorkspaceMember.objects.create(workspace=workspace, user=owner, role="owner", is_active=True)
        WorkspaceMember.objects.create(workspace=workspace, user=member, role="member", is_active=True)

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
        outsider = self.User.objects.create(username="outsider", email="outsider@test.com")

        workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Test workspace",
            created_by=owner,
        )

        WorkspaceMember.objects.create(workspace=workspace, user=owner, role="owner", is_active=True)

        client = APIClient()
        client.force_authenticate(user=outsider)

        url = reverse("events:workspace-members")
        response = client.get(url, HTTP_X_WORKSPACE_ID=str(workspace.workspace_id))

        self.assertEqual(response.status_code, 403)
