"""
Test cases for AI Chat Feature
Tests cover models, serializers, and API views
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from workspaces.models import Workspace, WorkspaceMember
from .models import ChatDocument, AIConversation
from .serializers import ChatDocumentSerializer, AIConversationSerializer
from unittest.mock import patch, MagicMock
from io import BytesIO

User = get_user_model()


class ChatDocumentModelTest(TestCase):
    """Test cases for ChatDocument model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )

    def test_chat_document_creation(self):
        """Test 1: ChatDocument can be created successfully"""
        document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-file-key-123",
            file_name="test_document.pdf",
            file_size=1024,
        )

        self.assertEqual(document.file_name, "test_document.pdf")
        self.assertEqual(document.file_size, 1024)
        self.assertEqual(document.user, self.user)
        self.assertEqual(document.workspace, self.workspace)

    def test_chat_document_string_representation(self):
        """Test 2: ChatDocument __str__ method returns correct format"""
        document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="sample.pdf",
            file_size=2048,
        )

        expected_str = f"sample.pdf (uploaded by {self.user.email})"
        self.assertEqual(str(document), expected_str)


class AIConversationModelTest(TestCase):
    """Test cases for AIConversation model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        self.document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="test.pdf",
            file_size=1024,
        )

    def test_ai_conversation_auto_title_generation(self):
        """Test 3: AIConversation auto-generates title when not provided"""
        conversation = AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="summary",
            ai_response="This is a test summary.",
        )

        expected_title = "Summary - test.pdf"
        self.assertEqual(conversation.title, expected_title)

    def test_ai_conversation_with_custom_title(self):
        """Test 4: AIConversation respects custom title"""
        custom_title = "My Custom Summary Title"
        conversation = AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="plan",
            title=custom_title,
            ai_response="This is a test plan.",
        )

        self.assertEqual(conversation.title, custom_title)

    def test_ai_conversation_saved_to_notes_default(self):
        """Test 5: AIConversation saved_to_notes defaults to False"""
        conversation = AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="summary",
            ai_response="Test response",
        )

        self.assertFalse(conversation.saved_to_notes)


class ChatDocumentSerializerTest(TestCase):
    """Test cases for ChatDocument serializer"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )

    def test_chat_document_serializer_fields(self):
        """Test 6: ChatDocumentSerializer includes correct fields"""
        document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="document.pdf",
            file_size=5000,
        )

        serializer = ChatDocumentSerializer(document)
        data = serializer.data

        self.assertIn("id", data)
        self.assertIn("file_name", data)
        self.assertIn("file_size", data)
        self.assertIn("uploaded_at", data)
        self.assertEqual(data["file_name"], "document.pdf")
        self.assertEqual(data["file_size"], 5000)


class AIConversationSerializerTest(TestCase):
    """Test cases for AIConversation serializer"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        self.document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="test.pdf",
            file_size=1024,
        )

    def test_ai_conversation_serializer_fields(self):
        """Test 7: AIConversationSerializer includes correct fields"""
        conversation = AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="summary",
            ai_response="Test AI response content",
        )

        serializer = AIConversationSerializer(conversation)
        data = serializer.data

        self.assertIn("id", data)
        self.assertIn("action_type", data)
        self.assertIn("title", data)
        self.assertIn("ai_response", data)
        self.assertIn("saved_to_notes", data)
        self.assertIn("document", data)
        self.assertEqual(data["action_type"], "summary")
        self.assertEqual(data["ai_response"], "Test AI response content")


class ConversationListViewTest(APITestCase):
    """Test cases for Conversation List API View"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        # Add user as workspace member
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )
        self.document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="test.pdf",
            file_size=1024,
        )

        # Create some conversations
        AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="summary",
            ai_response="Summary response",
        )
        AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="plan",
            ai_response="Plan response",
        )

    def test_conversation_list_requires_authentication(self):
        """Test 8: Conversation list requires authentication"""
        response = self.client.get("/api/chat/conversations/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_conversation_list_with_authentication(self):
        """Test 9: Authenticated user can list their conversations"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            "/api/chat/conversations/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class SaveToNotesViewTest(APITestCase):
    """Test cases for Save to Notes API View"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        # Add user as workspace member
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )
        self.document = ChatDocument.objects.create(
            user=self.user,
            workspace=self.workspace,
            file_key="test-key",
            file_name="test.pdf",
            file_size=1024,
        )
        self.conversation = AIConversation.objects.create(
            user=self.user,
            workspace=self.workspace,
            document=self.document,
            action_type="summary",
            ai_response="Test response",
        )

    def test_save_to_notes_updates_flag(self):
        """Test 10: Save to notes updates the saved_to_notes flag"""
        self.client.force_authenticate(user=self.user)

        # Verify initial state
        self.assertFalse(self.conversation.saved_to_notes)

        # Make save to notes request
        response = self.client.post(
            f"/api/chat/conversations/{self.conversation.id}/save-notes/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh from database and verify flag is updated
        self.conversation.refresh_from_db()
        self.assertTrue(self.conversation.saved_to_notes)
