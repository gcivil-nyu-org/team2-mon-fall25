from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.test import override_settings
from workspaces.models import Workspace, WorkspaceMember
import uuid

from notes.models import Note

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class NotesAPITests(APITestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@x.com", password="password123"
        )
        self.workspace = Workspace.objects.create(
            workspace_id="123e4567-e89b-12d3-a456-426614174000",
            name="Test WS",
            description="desc",
            created_by=self.user,
        )

        self.workspace_id = str(self.workspace.workspace_id)
        self.client.force_authenticate(self.user)

        self.workspace_id = "123e4567-e89b-12d3-a456-426614174000"

        self.create_url = "/api/notes/create/"
        self.list_url = "/api/notes/list/"
        self.update_url = "/api/notes/update/"
        self.delete_url = "/api/notes/delete/"

    # ---------------------------------------------------------
    # CREATE NOTE TESTS
    # ---------------------------------------------------------

    def test_create_note_success(self):
        data = {
            "title": "My Note",
            "content": "Hello world",
            "tags": ["sample"],
            "workspace": self.workspace_id,
        }

        response = self.client.post(self.create_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Note.objects.count(), 1)
        self.assertEqual(response.data["title"], "My Note")
        self.assertEqual(str(response.data["workspace"]), self.workspace_id)

        def test_create_note_missing_workspace(self):
            data = {"title": "My Note", "content": "Hello", "tags": ["sample"]}

            response = self.client.post(self.create_url, data, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("workspace", response.data["error"])

    # ---------------------------------------------------------
    # GET NOTES BY WORKSPACE
    # ---------------------------------------------------------

    def test_get_notes_by_workspace_success(self):
        Note.objects.create(
            owner=self.user,
            title="Note 1",
            content="abc",
            tags=["x"],
            workspace=self.workspace,  # FIXED here
        )

        response = self.client.get(f"{self.list_url}?workspace_id={self.workspace_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Note 1")

    def test_get_notes_missing_workspace(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.data["error"])

    def test_get_notes_different_workspace_returns_empty(self):
        # Create another workspace (NOT the main one)
        other_ws = Workspace.objects.create(
            workspace_id="999e4567-e89b-12d3-a456-426614174999",
            name="Other Workspace",
            description="other ws",
            created_by=self.user,
        )

        # Create note in the OTHER workspace
        Note.objects.create(
            owner=self.user,
            title="Note 1",
            content="abc",
            tags=["x"],
            workspace=other_ws,  # FIXED
        )

        # Fetch notes from MAIN workspace
        response = self.client.get(f"{self.list_url}?workspace_id={self.workspace_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)  # Should be empty

    # ---------------------------------------------------------
    # UPDATE NOTE
    # ---------------------------------------------------------

    def test_update_note_success(self):
        note = Note.objects.create(
            owner=self.user,
            title="Old Title",
            content="Old Content",
            tags=["old"],
            workspace=self.workspace,  # FIXED
        )

        data = {"title": "New Title", "content": "Updated content"}

        response = self.client.put(f"{self.update_url}{note.id}/", data, format="json")

        self.assertEqual(response.status_code, 200)
        note.refresh_from_db()
        self.assertEqual(note.title, "New Title")
        self.assertEqual(note.content, "Updated content")

    def test_update_note_not_found(self):
        response = self.client.put(
            f"{self.update_url}9999/", {"title": "x"}, format="json"
        )

        self.assertEqual(response.status_code, 404)
        self.assertIn("Note not found", response.data["error"])

    # ---------------------------------------------------------
    # DELETE NOTE
    # ---------------------------------------------------------

    def test_delete_note_success(self):
        note = Note.objects.create(
            owner=self.user,
            title="Del Note",
            content="abc",
            tags=[],
            workspace=self.workspace,  # FIXED
        )

        response = self.client.delete(f"{self.delete_url}{note.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(Note.objects.count(), 0)

    def test_delete_note_not_found(self):
        response = self.client.delete(f"{self.delete_url}9999/")
        self.assertEqual(response.status_code, 404)
        self.assertIn("Note not found", response.data["error"])

    def test_user_cannot_delete_other_user_note(self):
        other_user = User.objects.create_user(
            username="other", email="other@example.com", password="pass"
        )

        note = Note.objects.create(
            owner=other_user,
            title="Not Yours",
            content="xxx",
            tags=[],
            workspace=self.workspace,  # FIXED
        )

        response = self.client.delete(f"{self.delete_url}{note.id}/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Note.objects.count(), 1)


class NotesSharingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="pass123",
        )
        self.member1 = User.objects.create_user(
            username="m1",
            email="m1@test.com",
            password="pass123",
        )
        self.member2 = User.objects.create_user(
            username="m2",
            email="m2@test.com",
            password="pass123",
        )
        self.outsider = User.objects.create_user(
            username="outsider",
            email="x@test.com",
            password="pass123",
        )

        # Workspace
        self.workspace = Workspace.objects.create(
            workspace_id=str(uuid.uuid4()),
            name="Test WS",
            created_by=self.owner,
        )

        self.other_workspace = Workspace.objects.create(
            workspace_id=str(uuid.uuid4()),
            name="Other WS",
            created_by=self.owner,
        )

        # Workspace members
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role="owner",
            is_active=True,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member1,
            role="member",
            is_active=True,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member2,
            role="member",
            is_active=True,
        )

        WorkspaceMember.objects.create(
            workspace=self.other_workspace,
            user=self.outsider,
            role="member",
            is_active=True,
        )

        # Note
        self.note = Note.objects.create(
            owner=self.owner,
            title="Shared Note",
            content="hello",
            workspace=self.workspace,
        )

        self.client.force_authenticate(self.owner)

        self.share_url = f"/api/notes/{self.note.id}/share/"
        self.shared_notes_url = "/api/notes/shared/"

    # --------------------------------------------------
    # SHARE NOTE
    # --------------------------------------------------

    def test_share_note_success(self):
        payload = {
            "ids": [
                str(self.member1.user_id),
                str(self.member2.user_id),
            ]
        }

        res = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.note.refresh_from_db()
        self.assertTrue(self.note.is_shared)
        self.assertEqual(self.note.shared_with.count(), 2)

    def test_share_note_requires_owner(self):
        self.client.force_authenticate(self.member1)

        payload = {"ids": [str(self.member2.user_id)]}
        res = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_share_note_invalid_payload(self):
        res = self.client.post(self.share_url, {"ids": "not-a-list"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_share_note_user_not_found(self):
        payload = {"ids": [str(uuid.uuid4())]}

        res = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("do not exist", res.data["error"])

    def test_share_note_user_not_in_workspace(self):
        payload = {"ids": [str(self.outsider.user_id)]}

        res = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not part of this workspace", res.data["error"])

    # --------------------------------------------------
    # SHARED NOTES LIST
    # --------------------------------------------------

    def test_shared_notes_list_success(self):
        self.note.shared_with.add(self.member1)
        self.note.is_shared = True
        self.note.save()

        self.client.force_authenticate(self.member1)

        res = self.client.get(
            self.shared_notes_url,
            {"workspace_id": self.workspace.workspace_id},
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], self.note.id)

    def test_shared_notes_excludes_owner(self):
        self.note.shared_with.add(self.owner)
        self.note.is_shared = True
        self.note.save()

        res = self.client.get(
            self.shared_notes_url,
            {"workspace_id": self.workspace.workspace_id},
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_shared_notes_requires_workspace_param(self):
        res = self.client.get(self.shared_notes_url)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
