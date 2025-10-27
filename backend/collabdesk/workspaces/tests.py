import uuid
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from workspaces.models import Workspace, WorkspaceMember
from django.test import override_settings

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceInformationViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.client.force_authenticate(user=self.user)

        # create workspace with valid UUID and created_by
        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            workspace_id=uuid.uuid4(),
            created_by=self.user,
        )

        self.url = reverse("workspaces:workspace-information")

    def test_get_workspace_info_as_member(self):
        WorkspaceMember.objects.create(workspace=self.workspace, user_id=self.user.id)

        response = self.client.get(
            self.url,
            {
                "workspace_id": str(self.workspace.workspace_id),
                "user_id": str(self.user.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("is_member", response.data)
        self.assertTrue(response.data["is_member"])
        self.assertIn("workspace_id", response.data)
        self.assertIn("is_public", response.data)

    def test_get_workspace_info_as_non_member(self):
        response = self.client.get(
            self.url,
            {
                "workspace_id": str(self.workspace.workspace_id),
                "user_id": str(self.user.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_member"])
        self.assertNotIn("members", response.data)
        self.assertNotIn("owner", response.data)

    def test_missing_workspace_id(self):
        response = self.client.get(self.url, {"user_id": str(self.user.id)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_user_id(self):
        response = self.client.get(
            self.url, {"workspace_id": str(self.workspace.workspace_id)}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_workspace_id(self):
        bad_uuid = uuid.uuid4()
        response = self.client.get(
            self.url,
            {"workspace_id": str(bad_uuid), "user_id": str(self.user.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_user(self):
        self.client.logout()
        response = self.client.get(
            self.url,
            {
                "workspace_id": str(self.workspace.workspace_id),
                "user_id": str(self.user.id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceListViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="listuser", password="testpass")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("workspaces:workspace-name-list")

    def test_get_workspace_list_empty(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_workspace_list_with_items(self):
        Workspace.objects.create(name="Workspace 1", created_by=self.user)
        Workspace.objects.create(name="Workspace 2", created_by=self.user)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertIn("workspace_id", response.data[0])
        self.assertIn("name", response.data[0])

    def test_unauthenticated_user_cannot_access_list(self):
        self.client.logout()
        print(self.url)
        response = self.client.get(self.url)
        print(response)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
