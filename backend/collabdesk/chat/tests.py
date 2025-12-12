"""
Test cases for AI Chat Feature
Tests cover models, serializers, and API views
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from workspaces.models import Workspace, WorkspaceMember
from notes.models import Note
from resources.s3_utils import upload_file_to_s3
from .models import ChatDocument, AIConversation
from .serializers import ChatDocumentSerializer, AIConversationSerializer
from .ai_service import (
    process_document_and_generate_response,
    validate_file_type,
    get_supported_file_types,
    extract_text_from_txt,
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_document,
    generate_ai_response,
    DocumentProcessingError,
    AIServiceError,
)
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


class AIServiceTest(TestCase):
    """Test cases for AI Service utility functions"""

    def test_validate_file_type_pdf(self):
        """Test 11: validate_file_type returns True for PDF files"""
        self.assertTrue(validate_file_type("document.pdf"))
        self.assertTrue(validate_file_type("document.PDF"))

    def test_validate_file_type_docx(self):
        """Test 12: validate_file_type returns True for DOCX files"""
        self.assertTrue(validate_file_type("document.docx"))
        self.assertTrue(validate_file_type("document.doc"))

    def test_validate_file_type_txt(self):
        """Test 13: validate_file_type returns True for TXT files"""
        self.assertTrue(validate_file_type("document.txt"))
        self.assertTrue(validate_file_type("document.TXT"))

    def test_validate_file_type_unsupported(self):
        """Test 14: validate_file_type returns False for unsupported files"""
        self.assertFalse(validate_file_type("document.xlsx"))
        self.assertFalse(validate_file_type("document.jpg"))
        self.assertFalse(validate_file_type("document.png"))

    def test_get_supported_file_types(self):
        """Test 15: get_supported_file_types returns correct list"""
        supported_types = get_supported_file_types()
        self.assertIsInstance(supported_types, list)
        self.assertIn("pdf", supported_types)
        self.assertIn("docx", supported_types)
        self.assertIn("doc", supported_types)
        self.assertIn("txt", supported_types)
        self.assertEqual(len(supported_types), 4)


class ConversationDetailViewTest(APITestCase):
    """Test cases for Conversation Detail API View"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
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
            ai_response="Test AI response content",
        )

    def test_conversation_detail_retrieval(self):
        """Test 16: Can retrieve conversation detail with authentication"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            f"/api/chat/conversations/{self.conversation.id}/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.conversation.id)
        self.assertEqual(response.data["action_type"], "summary")
        self.assertEqual(response.data["ai_response"], "Test AI response content")


class ConversationDeleteViewTest(APITestCase):
    """Test cases for Conversation Delete API View"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
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

    def test_conversation_deletion(self):
        """Test 17: Can delete conversation with authentication"""
        self.client.force_authenticate(user=self.user)

        # Verify conversation exists
        self.assertTrue(AIConversation.objects.filter(id=self.conversation.id).exists())

        # Delete conversation
        response = self.client.delete(
            f"/api/chat/conversations/{self.conversation.id}/delete/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify conversation is deleted
        self.assertFalse(
            AIConversation.objects.filter(id=self.conversation.id).exists()
        )


class DocumentUploadViewTest(APITestCase):
    """Test cases for Document Upload API View"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )

    def test_document_upload_without_file(self):
        """Test 18: Document upload returns error when no file provided"""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chat/documents/upload/",
            {},
            HTTP_X_WORKSPACE_ID=str(self.workspace.workspace_id),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"], "No file provided")


class AIServiceUnitTest(TestCase):
    """
    Unit tests for ai_service.py covering document extraction and AI response generation.
    Covers successful paths, empty content, and various exception handling.
    """

    def test_validate_file_type_supported(self):
        """Test supported file types (case-insensitive)"""
        self.assertTrue(validate_file_type("file.pdf"))
        self.assertTrue(validate_file_type("file.DOCX"))
        self.assertTrue(validate_file_type("file.tXt"))
        self.assertTrue(validate_file_type("file.doc"))

    def test_validate_file_type_unsupported(self):
        """Test unsupported file types"""
        self.assertFalse(validate_file_type("file.jpg"))

    # --- TXT Extraction Tests ---

    def test_extract_text_from_txt_success(self):
        """Test successful text extraction from simple bytes"""
        content = b"This is a test document."
        self.assertEqual(extract_text_from_txt(content), "This is a test document.")

    def test_extract_text_from_txt_empty(self):
        """Test empty text file raises error"""
        with self.assertRaises(DocumentProcessingError):
            extract_text_from_txt(b"  \n  ")

    # --- PDF Extraction Tests ---

    # Fix: Patch PyPDF2.PdfReader where it is imported in ai_service.py
    @patch("chat.ai_service.PdfReader")
    def test_extract_text_from_pdf_success(self, MockPdfReader):
        """Test successful PDF extraction"""
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page 1 content"
        mock_reader = MockPdfReader.return_value
        # Mocking the pages attribute which PdfReader provides
        mock_reader.pages = [mock_page1]

        expected_text = "--- Page 1 ---\nPage 1 content"
        self.assertEqual(extract_text_from_pdf(b"pdf_content"), expected_text)

    @patch("chat.ai_service.PdfReader")
    def test_extract_text_from_pdf_empty(self, MockPdfReader):
        """Test PDF with no extractable text raises error"""
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = " "
        mock_reader = MockPdfReader.return_value
        mock_reader.pages = [mock_page1]

        with self.assertRaises(DocumentProcessingError):
            extract_text_from_pdf(b"pdf_content")

    @patch("chat.ai_service.PdfReader", side_effect=Exception("Corrupted PDF"))
    def test_extract_text_from_pdf_failure(self, MockPdfReader):
        """Test corrupted PDF raises DocumentProcessingError"""
        with self.assertRaises(DocumentProcessingError):
            extract_text_from_pdf(b"corrupt_content")

    # --- DOCX Extraction Tests ---

    # Fix: Patch docx.Document where it is imported in ai_service.py
    @patch("chat.ai_service.Document")
    def test_extract_text_from_docx_success(self, MockDocument):
        """Test successful DOCX extraction"""
        mock_doc = MockDocument.return_value
        mock_doc.paragraphs = [
            MagicMock(text="Para 1"),
            MagicMock(text="Para 2"),
        ]
        expected_text = "Para 1\n\nPara 2"
        # The function call now uses the mocked docx.Document
        self.assertEqual(extract_text_from_docx(b"docx_content"), expected_text)

    @patch("chat.ai_service.Document")
    def test_extract_text_from_docx_empty(self, MockDocument):
        """Test DOCX with no paragraphs raises error"""
        mock_doc = MockDocument.return_value
        mock_doc.paragraphs = [
            MagicMock(text=""),
        ]
        with self.assertRaises(DocumentProcessingError):
            extract_text_from_docx(b"docx_content")

    @patch("chat.ai_service.Document", side_effect=Exception("Corrupted DOCX"))
    def test_extract_text_from_docx_failure(self, MockDocument):
        """Test corrupted DOCX raises DocumentProcessingError"""
        with self.assertRaises(DocumentProcessingError):
            extract_text_from_docx(b"corrupt_content")

    # --- Document Router Tests ---

    @patch("chat.ai_service.extract_text_from_pdf", return_value="PDF Text")
    def test_extract_text_from_document_pdf(self, mock_pdf):
        """Test document router calls PDF extractor"""
        self.assertEqual(extract_text_from_document(b"", "file.pdf"), "PDF Text")

    def test_extract_text_from_document_unsupported(self):
        """Test unsupported extension raises error"""
        with self.assertRaises(DocumentProcessingError):
            extract_text_from_document(b"", "file.jpg")

    # --- Full Pipeline Test (process_document_and_generate_response) ---

    # Fix: Corrected S3 mock to return dictionary format expected by download_document_from_s3
    @patch(
        "chat.ai_service.download_file_from_s3",
        return_value={"success": True, "file_content": b"test_content"},
    )
    @patch("chat.ai_service.extract_text_from_document", return_value="Extracted Text")
    @patch("chat.ai_service.generate_ai_response", return_value="AI Result")
    def test_process_document_success(self, mock_ai, mock_extract, mock_download):
        """Test the entire pipeline runs successfully"""
        extracted, response = process_document_and_generate_response(
            "key", "file.pdf", "plan"
        )
        self.assertEqual(extracted, "Extracted Text")
        self.assertEqual(response, "AI Result")

    # Fix: Corrected S3 mock to return dictionary format expected by download_document_from_s3
    @patch("chat.ai_service.download_file_from_s3", side_effect=Exception("S3 Failed"))
    def test_process_document_s3_failure(self, mock_download):
        """Test S3 failure raises Exception"""
        with self.assertRaises(
            DocumentProcessingError
        ):  # The wrapper should catch and raise DocumentProcessingError
            process_document_and_generate_response("key", "file.pdf", "plan")

    @patch(
        "chat.ai_service.download_file_from_s3",
        return_value={"success": True, "file_content": b"test_content"},
    )
    @patch(
        "chat.ai_service.extract_text_from_document",
        side_effect=DocumentProcessingError("Extraction Failed"),
    )
    def test_process_document_extraction_failure(self, mock_extract, mock_download):
        """Test extraction failure raises DocumentProcessingError"""
        with self.assertRaises(DocumentProcessingError):
            process_document_and_generate_response("key", "file.pdf", "plan")


class AIChatViewErrorTests(APITestCase):
    """
    Test cases focusing on error handling and validation in DocumentUploadView,
    ConversationCreateView, and SaveToNotesView.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.other_user = User.objects.create_user(
            username="otheruser", email="other@example.com", password="testpass123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )
        self.client.force_authenticate(user=self.user)

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
            ai_response="Test AI response content",
        )

        # URL constants
        self.upload_url = "/api/chat/documents/upload/"
        self.create_conv_url = "/api/chat/conversations/"
        self.save_note_url = (
            f"/api/chat/conversations/{self.conversation.id}/save-to-notes/"
        )
        self.headers = {"HTTP_X_WORKSPACE_ID": str(self.workspace.workspace_id)}

    # --- DocumentUploadView Error Tests ---

    def test_document_upload_no_file(self):
        """Test: Document upload returns error when no file provided"""
        response = self.client.post(self.upload_url, {}, **self.headers)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "No file provided")

    # Fix: Use SimpleUploadedFile for realistic file mocking
    def test_document_upload_unsupported_file_type(self):
        """Test: Document upload with unsupported file type"""
        bad_file = SimpleUploadedFile(
            "test.jpg", b"file content", content_type="image/jpeg"
        )

        response = self.client.post(
            self.upload_url, {"file": bad_file}, format="multipart", **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported file type", response.data["error"])

    # Fix: Use SimpleUploadedFile with a supported extension and massive size
    def test_document_upload_file_too_large(self):
        """Test: Document upload with file size exceeding 10MB"""
        # Create a mock file larger than 10MB (10*1024*1024 + 1 bytes)
        large_content = b"a" * (10 * 1024 * 1024 + 1)
        too_large_file = SimpleUploadedFile(
            "large.pdf", large_content, content_type="application/pdf"
        )

        response = self.client.post(
            self.upload_url,
            {"file": too_large_file},
            format="multipart",
            **self.headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("File too large", response.data["error"])

    # Fix: Use SimpleUploadedFile to ensure size/type checks pass before S3 mock
    @patch("resources.s3_utils.upload_file_to_s3")
    def test_document_upload_s3_failure(self, mock_s3_upload):
        """Test: S3 upload failure returns 500"""
        mock_s3_upload.return_value = {
            "success": False,
            "error": "AWS credentials failed",
        }
        # Valid file that will pass view's size/type checks
        mock_file = SimpleUploadedFile(
            "fail.pdf", b"small content", content_type="application/pdf"
        )

        response = self.client.post(
            self.upload_url, {"file": mock_file}, format="multipart", **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to upload file to storage", response.data["error"])

    def test_save_to_notes_conversation_not_found(self):
        """Test: Non-existent conversation returns 404"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/chat/conversations/99999999-9999-9999-9999-999999999999/save-to-notes/",
            **self.headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
