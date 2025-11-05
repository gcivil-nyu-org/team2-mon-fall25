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
