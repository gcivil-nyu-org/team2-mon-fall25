from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from messageboard.models import Message, Reaction
from messageboard.serializers import SimpleUserSerializer, MessageSerializer
from workspaces.models import Workspace, WorkspaceMember

# Then define User model
User = get_user_model()


def create_auth_user(auth0_sub, **kwargs):
    """Creates a user with unique username and email."""
    # Ensure a unique username is always created
    username = kwargs.pop("username", f"user_{auth0_sub[-4:]}")
    # Ensure a unique email is always created to satisfy the UNIQUE constraint
    email = kwargs.pop("email", f"{auth0_sub}@test.com")

    return User.objects.create(
        auth0_sub=auth0_sub,
        username=username,
        email=email,
        **kwargs,
    )


class SimpleAPITests(APITestCase):
    def setUp(self):
        self.user1 = create_auth_user("auth0|u1")
        self.user2 = create_auth_user("auth0|u2")

        # Create workspace and add users as members
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user1
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user1, role="owner"
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user2, role="member"
        )

        self.message = Message.objects.create(
            author=self.user1, content="Hello", workspace=self.workspace
        )
        self.detail_url = reverse("message-detail", kwargs={"pk": self.message.pk})
        self.list_url = reverse("message-list-create")
        self.reaction_url = reverse("reaction-toggle", kwargs={"pk": self.message.pk})

    # --- MessageDetailView (IsAuthorOrReadOnly) ---

    def test_detail_read_ok(self):
        """Test GET method is allowed for authenticated workspace members (ReadOnly)."""
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detail_update_by_author(self):
        """Test author can update (Author)."""
        self.client.force_authenticate(user=self.user1)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.put(self.detail_url, {"content": "New"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detail_update_by_other_user_denied(self):
        """Test other user cannot update (Forbidden)."""
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.put(
            self.detail_url, {"content": "Denied"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- ReactionToggleView ---

    def test_reaction_add_successful(self):
        """Test adding a reaction creates a 201 response."""
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.reaction_url, {"emoji": "😄"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reaction.objects.count(), 1)

    def test_reaction_remove_successful(self):
        """Test removing an existing reaction returns 200."""
        Reaction.objects.create(
            user=self.user2, message=self.message, reaction_type="😄"
        )
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.reaction_url, {"emoji": "😄"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Reaction.objects.count(), 0)

    def test_reaction_unauthenticated_denied(self):
        """Test unauthenticated user is denied."""
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.reaction_url, {"emoji": "😄"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reaction_missing_user_id(self):
        """Test handling for user object without auth0_sub (coverage for line 44)."""
        bad_user = User.objects.create(username="no_sub")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=bad_user, role="member"
        )
        self.client.force_authenticate(user=bad_user)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.reaction_url, {"emoji": "😄"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("User identifier missing", response.data["detail"])


# --- MessageListCreateView ---


class MessageCreateTests(APITestCase):
    def setUp(self):
        self.user = create_auth_user("auth0|test")
        self.url = reverse("message-list-create")

        # Create workspace and add user as member
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )

    def test_create_message_authenticated(self):
        """Test creation by authenticated user (201)."""
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.url, {"content": "New Msg"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 1)

    def test_create_message_unauthenticated_denied(self):
        """Test creation by unauthenticated user (401)."""
        self.client.credentials(HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id))
        response = self.client.post(self.url, {"content": "Forbidden"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SimpleSerializerTests(TestCase):
    def setUp(self):
        # User with full_name
        self.user1 = User.objects.create(
            auth0_sub="sub1", full_name="John Doe", username="john"
        )
        # User without full_name
        self.user2 = User.objects.create(
            auth0_sub="sub2", full_name="", username="jane", email="jane@test.com"
        )
        # User only with email
        self.user3 = User.objects.create(
            auth0_sub="sub3", full_name="", username="", email="emailonly@test.com"
        )

        # Create workspace for message
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user1
        )

        self.message = Message.objects.create(
            author=self.user1, content="Hi", workspace=self.workspace
        )
        Reaction.objects.create(
            user=self.user1, message=self.message, reaction_type="A"
        )
        Reaction.objects.create(
            user=self.user2, message=self.message, reaction_type="A"
        )
        Reaction.objects.create(
            user=self.user1, message=self.message, reaction_type="B"
        )

    # --- SimpleUserSerializer get_name coverage ---

    def test_user_name_prefers_full_name(self):
        """Test get_name method returns full_name if present."""
        data = SimpleUserSerializer(self.user1).data
        self.assertEqual(data["name"], "John Doe")

    def test_user_name_falls_back_to_username(self):
        """Test get_name method falls back to username."""
        data = SimpleUserSerializer(self.user2).data
        self.assertEqual(data["name"], "jane")

    def test_user_name_falls_back_to_email(self):
        """Test get_name method falls back to email."""
        data = SimpleUserSerializer(self.user3).data
        self.assertEqual(data["name"], "emailonly@test.com")

    # --- MessageSerializer get_reactions coverage ---

    def test_get_reactions_groups_correctly(self):
        """Test reactions are grouped by emoji and users are included."""
        serializer = MessageSerializer(self.message)
        reactions_data = serializer.data["reactions"]

        self.assertEqual(
            len(reactions_data), 2, "Should have two unique emojis (A and B)."
        )

        reaction_a = next(r for r in reactions_data if r["emoji"] == "A")
        reaction_b = next(r for r in reactions_data if r["emoji"] == "B")

        self.assertEqual(len(reaction_a["users"]), 2, "Emoji 'A' should have 2 users.")
        self.assertEqual(len(reaction_b["users"]), 1, "Emoji 'B' should have 1 user.")

    def test_get_replies_empty_list(self):
        """Test get_replies returns an empty list when no replies exist."""
        # Note: self.message has no replies
        serializer = MessageSerializer(self.message)
        self.assertEqual(serializer.data["replies"], [])
