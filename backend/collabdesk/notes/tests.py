from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.test import override_settings
from workspaces.models import Workspace, WorkspaceMember


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


@override_settings(SECURE_SSL_REDIRECT=False)
class NotesSharingTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        # Users
        self.owner = User.objects.create_user(
            username="owner", email="owner@test.com", password="pass123"
        )
        self.member1 = User.objects.create_user(
            username="m1", email="m1@test.com", password="pass123"
        )
        self.member2 = User.objects.create_user(
            username="m2", email="m2@test.com", password="pass123"
        )
        self.outsider = User.objects.create_user(
            username="x", email="x@test.com", password="pass123"
        )

        # Workspace
        self.workspace = Workspace.objects.create(
            workspace_id="111e1111-e89b-12d3-a456-426614170000",
            name="WS",
            description="",
            created_by=self.owner,
        )

        # Members of workspace
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

        # Note owned by owner
        self.note = Note.objects.create(
            owner=self.owner,
            title="Shared Note",
            content="abc",
            tags=["x"],
            workspace=self.workspace,
        )

        self.client.force_authenticate(self.owner)

        # URLs used
        self.share_url = f"/api/notes/{self.note.id}/share/"
        self.unshare_url = f"/api/notes/{self.note.id}/share/"
        self.shared_notes_url = "/api/notes/shared/"

    # ---------------------------------------------------------
    # SHARE NOTE
    # ---------------------------------------------------------

    def test_share_note_success(self):
        wm1 = WorkspaceMember.objects.get(
            workspace=self.workspace, user=self.member1, is_active=True
        )
        wm2 = WorkspaceMember.objects.get(
            workspace=self.workspace, user=self.member2, is_active=True
        )

        payload = {"user_ids": [wm1.user_id, wm2.user_id]}

        response = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(response.status_code, 200)

        self.note.refresh_from_db()
        self.assertEqual(self.note.shared_with.count(), 2)
        self.assertTrue(self.note.is_shared)

    def test_share_note_user_not_in_workspace(self):
        payload = {"user_ids": [self.outsider.id]}

        response = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("not part of this workspace", response.data["error"])

    def test_share_note_only_owner_can_share(self):
        self.client.force_authenticate(self.member1)

        payload = {"user_ids": [str(self.member2.id)]}

        response = self.client.post(self.share_url, payload, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertIn("Only the owner", response.data["error"])

    def test_share_note_invalid_user_ids_type(self):
        response = self.client.post(
            self.share_url, {"user_ids": "not-list"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("user_ids must be a list", response.data["error"])

    # ---------------------------------------------------------
    # UNSHARE NOTE
    # ---------------------------------------------------------

    def test_unshare_note_success(self):
        # First share
        self.note.shared_with.set([self.member1.id, self.member2.id])

        response = self.client.delete(f"{self.unshare_url}{self.member1.id}/")

        self.assertEqual(response.status_code, 200)
        self.note.refresh_from_db()

        self.assertEqual(self.note.shared_with.count(), 1)

    def test_shared_notes_list_success(self):
        # owner shares note with member1
        self.note.shared_with.set([self.member1.id])
        self.note.is_shared = True
        self.note.save()

        self.client.force_authenticate(self.member1)

        url = f"{self.shared_notes_url}?workspace_id={self.workspace.workspace_id}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Shared Note")

    def test_shared_notes_list_missing_workspace_id(self):
        self.client.force_authenticate(self.member1)

        response = self.client.get(self.shared_notes_url)

        self.assertEqual(response.status_code, 400)
        self.assertIn("workspace_id", response.data["detail"])

    def test_shared_notes_list_excludes_owner(self):
        # Owner sharing with member1
        self.note.shared_with.set([self.member1.id])
        self.note.is_shared = True
        self.note.save()

        # Owner should not see it in shared list
        self.client.force_authenticate(self.owner)

        url = f"{self.shared_notes_url}?workspace_id={self.workspace.workspace_id}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_shared_notes_list_returns_empty_if_not_shared(self):
        self.client.force_authenticate(self.member1)

        url = f"{self.shared_notes_url}?workspace_id={self.workspace.workspace_id}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)
