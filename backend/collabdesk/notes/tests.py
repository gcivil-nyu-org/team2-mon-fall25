from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.test import override_settings


from notes.models import Note, Workspace

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
