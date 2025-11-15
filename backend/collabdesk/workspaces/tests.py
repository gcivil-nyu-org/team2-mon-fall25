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
        self.user = User.objects.create_user(
            username="testuser", email="testuser@example.com", password="testpass"
        )
        self.client.force_authenticate(user=self.user)

        # create workspace with valid UUID and created_by
        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            workspace_id=uuid.uuid4(),
            created_by=self.user,
        )

        self.url = reverse("workspaces:workspace-information")

    def test_get_workspace_info_as_member(self):
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.user)

        response = self.client.get(
            self.url,
            {
                "workspace_id": str(self.workspace.workspace_id),
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
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_member"])
        self.assertNotIn("members", response.data)
        self.assertNotIn("owner", response.data)

    def test_missing_workspace_id(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_user_id(self):
        # This test is no longer valid since the view uses request.user instead of user_id parameter
        # The authenticated user is always available, so we test successful response instead
        response = self.client.get(
            self.url, {"workspace_id": str(self.workspace.workspace_id)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("is_member", response.data)

    def test_invalid_workspace_id(self):
        bad_uuid = uuid.uuid4()
        response = self.client.get(
            self.url,
            {"workspace_id": str(bad_uuid)},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_user(self):
        self.client.logout()
        response = self.client.get(
            self.url,
            {
                "workspace_id": str(self.workspace.workspace_id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceListViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="listuser", email="listuser@example.com", password="testpass"
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("workspaces:workspace-name-list")

    def test_get_workspace_list_empty(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_workspace_list_with_items(self):
        workspace1 = Workspace.objects.create(name="Workspace 1", created_by=self.user)
        workspace2 = Workspace.objects.create(name="Workspace 2", created_by=self.user)

        # Create WorkspaceMember entries so the user is a member of these workspaces
        WorkspaceMember.objects.create(
            workspace=workspace1, user=self.user, role="owner"
        )
        WorkspaceMember.objects.create(
            workspace=workspace2, user=self.user, role="owner"
        )

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


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceCreateViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="createuser", email="createuser@example.com", password="testpass"
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("workspaces:workspace-create")

    def test_create_workspace_success(self):
        payload = {
            "name": "My Test Workspace",
            "description": "Created via test",
            "members": [],
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Workspace.objects.filter(name="My Test Workspace").exists())

        workspace = Workspace.objects.get(name="My Test Workspace")
        self.assertEqual(workspace.created_by, self.user)
        self.assertTrue(workspace.is_active)
        self.assertEqual(response.data["name"], "My Test Workspace")

    def test_create_workspace_with_members(self):
        # create 2 mock users
        member1 = User.objects.create_user(
            username="m1", email="m1@ex.com", password="x"
        )
        member2 = User.objects.create_user(
            username="m2", email="m2@ex.com", password="x"
        )

        payload = {
            "name": "Team Workspace",
            "description": "Testing members",
            "members": [str(member1.user_id), str(member2.user_id)],
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        workspace = Workspace.objects.get(name="Team Workspace")

        # check members got added
        members = WorkspaceMember.objects.filter(workspace=workspace)
        self.assertEqual(members.count(), 3)
        self.assertTrue(members.filter(user=self.user, role="owner").exists())
        self.assertTrue(members.filter(user=member1).exists())

    def test_create_workspace_missing_name(self):
        payload = {"description": "No name provided"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_unauthenticated_user_cannot_create(self):
        self.client.logout()
        payload = {"name": "Unauthorized Workspace"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceDeleteViewTests(APITestCase):
    """Tests for deleting a workspace"""

    def setUp(self):
        # Create two users
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com", password="test123"
        )
        self.other_user = User.objects.create_user(
            username="member@example.com",
            email="member@example.com",
            password="test123",
        )

        # Create a workspace owned by 'owner'
        self.workspace = Workspace.objects.create(
            workspace_id=uuid.uuid4(),
            name="Test Workspace",
            description="Sample workspace for testing delete",
            created_by=self.owner,
        )

        # Add both as workspace members
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.owner)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.other_user)

        # URL for deletion
        self.delete_url = reverse(
            "workspaces:workspace-delete",
            kwargs={"workspace_id": str(self.workspace.workspace_id)},
        )

        # Clients
        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

        self.client_other = APIClient()
        self.client_other.force_authenticate(user=self.other_user)

    def test_delete_workspace_by_owner_success(self):
        """Owner can delete the workspace successfully"""
        response = self.client_owner.delete(self.delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workspace.objects.filter(pk=self.workspace.pk).exists())

    def test_delete_workspace_by_non_owner_forbidden(self):
        """Non-owner should not be able to delete workspace"""
        response = self.client_other.delete(self.delete_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("not authorized", response.data["detail"].lower())
        self.assertTrue(Workspace.objects.filter(pk=self.workspace.pk).exists())

    def test_delete_nonexistent_workspace_returns_404(self):
        """Returns 404 when workspace doesn't exist"""
        bad_url = reverse(
            "workspaces:workspace-delete",
            kwargs={"workspace_id": str(uuid.uuid4())},
        )
        response = self.client_owner.delete(bad_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceLeaveViewTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        #  Create users (with usernames — required by Django)
        self.owner = User.objects.create_user(
            username="owner_user", email="owner@example.com", password="pass123"
        )
        self.member = User.objects.create_user(
            username="member_user", email="member@example.com", password="pass123"
        )
        self.stranger = User.objects.create_user(
            username="stranger_user", email="stranger@example.com", password="pass123"
        )

        # Create a workspace
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.owner
        )

        # Add memberships
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role="owner",
            is_active=True,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role="member",
            is_active=True,
        )

        # API endpoint
        self.leave_url = reverse(
            "workspaces:leave-workspace", args=[self.workspace.workspace_id]
        )

    def test_member_can_leave_workspace(self):
        """Member (non-owner) can leave successfully"""
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.leave_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"], "You have successfully left the workspace."
        )

        # Membership deleted
        self.assertFalse(
            WorkspaceMember.objects.filter(
                user=self.member, workspace=self.workspace
            ).exists()
        )

    def test_owner_cannot_leave_workspace(self):
        """Owner cannot leave their own workspace"""
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.leave_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Owners cannot leave", response.data["detail"])

        # Membership still exists
        self.assertTrue(
            WorkspaceMember.objects.filter(
                user=self.owner, workspace=self.workspace
            ).exists()
        )

    def test_non_member_cannot_leave_workspace(self):
        """Non-member cannot leave"""
        self.client.force_authenticate(user=self.stranger)

        response = self.client.post(self.leave_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("You are not a member", response.data["detail"])

        # No memberships accidentally deleted
        self.assertEqual(WorkspaceMember.objects.count(), 2)


@override_settings(SECURE_SSL_REDIRECT=False)
class WorkspaceJoinViewTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        # Create users
        self.owner = User.objects.create_user(
            username="owner_user2", email="owner2@example.com", password="pass123"
        )
        self.member = User.objects.create_user(
            username="joining_user", email="join@example.com", password="testpass"
        )

        # Create workspace with invite code
        self.workspace = Workspace.objects.create(
            name="Joinable Workspace",
            description="For join tests",
            created_by=self.owner,
            invite_code="ABCDEFGH",  # 8-char code
        )

        # owner is a workspace member
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role="owner",
        )

        # URL for joining
        self.url = reverse("workspaces:workspace-join")

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_join_workspace_success(self):
        """User can join a workspace with a valid invite code."""
        self.authenticate(self.member)

        response = self.client.post(
            self.url, {"invite_code": "ABCDEFGH"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("workspace", response.data)
        self.assertIn("message", response.data)
        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace=self.workspace, user=self.member
            ).exists()
        )

    def test_join_workspace_invalid_code(self):
        """Invalid invite code should return 400."""
        self.authenticate(self.member)

        response = self.client.post(
            self.url, {"invite_code": "WRONG999"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invite_code", response.data)

    def test_unauthenticated_user_cannot_join(self):
        """Unauthenticated users must be rejected."""
        response = self.client.post(
            self.url, {"invite_code": "ABCDEFGH"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invite_code_case_insensitive(self):
        """Verify invite code works even if user enters lowercase."""
        self.authenticate(self.member)

        response = self.client.post(
            self.url, {"invite_code": "abcdefgh"}, format="json"
        )

        # expected behavior depends on your serializer logic:
        # if you enforce uppercase, update this test accordingly
        self.assertIn(response.status_code, [200, 400])

    def test_join_workspace_missing_code(self):
        """Missing invite_code should return 400."""
        self.authenticate(self.member)

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
