import uuid
import datetime

from django.utils import timezone
from django.test import TestCase
from .models import Event
from workspaces.models import Workspace
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient


def createEvent():
    e_uuid = uuid.uuid4()
    User = get_user_model()
    user = User.objects.create(username=f"user_{uuid.uuid4().hex[:8]}")

    workspace = Workspace.objects.create(
        name="CollabDesk Workspace",
        description="Main workspace for CollabDesk project",
        created_by=user,
    )
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
        workspace_id=workspace,
        created_at=created_at,
        updated_at=updated_at,
    )

    return event


class EventModelTests(TestCase):
    def test_create_event_and_str_method(self):
        event = createEvent()
        self.assertEqual(str(event), event.title)


class EventAPITests(TestCase):
    def setUp(self):
        self.event = createEvent()
        self.user = self.event.created_by
        self.workspace = self.event.workspace_id

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
            "created_by": self.user.id,
            "workspace_id": str(self.workspace.workspace_id),
            "created_at": created_at.isoformat(),
            "updated_at": created_at.isoformat(),
        }

        # Send POST request
        response = self.client.post(self.url, payload, format="json", follow=True)

        # Assertions
        self.assertEqual(response.status_code, 200)

    def test_get_with_event_id_uuid(self):
        event = createEvent()
        client = APIClient()
        client.force_authenticate(user=event.created_by)

        url = reverse("events:event-detail", args=(event.event_id,))
        response = client.get(url, follow=True)
        self.assertEqual(response.status_code, 200)

    def test_get_without_event_id_uuid(self):
        event = createEvent()
        client = APIClient()
        client.force_authenticate(user=event.created_by)

        url = reverse("events:event-list")
        response = client.get(url, follow=True)
        self.assertEqual(response.status_code, 200)
