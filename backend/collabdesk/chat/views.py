"""
API Views for AI Chat Feature
Handles document upload, conversation creation, and management
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import transaction
from collabdesk.middleware import set_workspace_context
from resources.s3_utils import upload_file_to_s3
from notes.models import Note
from .models import ChatDocument, AIConversation
from .serializers import (
    ChatDocumentSerializer,
    AIConversationSerializer,
    AIConversationListSerializer,
)
from .ai_service import (
    process_document_and_generate_response,
    validate_file_type,
    DocumentProcessingError,
    AIServiceError,
)
import logging

logger = logging.getLogger(__name__)


class DocumentUploadView(APIView):
    """
    POST /api/chat/documents/upload/
    Upload a document to S3 and create ChatDocument record
    """

    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def post(self, request):
        """Upload document to S3"""
        user = request.user

        # Validate workspace context
        if not hasattr(request, "workspace") or not request.workspace:
            logger.error(
                f"No workspace context for document upload by user={user.email}"
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        # Check if file is in request
        if "file" not in request.FILES:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES["file"]
        file_name = uploaded_file.name

        # Validate file type
        if not validate_file_type(file_name):
            return Response(
                {
                    "error": "Unsupported file type",
                    "supported_types": ["pdf", "docx", "doc", "txt"],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if uploaded_file.size > max_size:
            return Response(
                {"error": "File too large. Maximum size is 10MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Upload to S3
            result = upload_file_to_s3(
                file_obj=uploaded_file,
                filename=file_name,
                content_type=uploaded_file.content_type,
            )

            if not result.get("success"):
                logger.error(f"S3 upload failed: {result.get('error')}")
                return Response(
                    {"error": "Failed to upload file to storage"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Create ChatDocument record
            chat_document = ChatDocument.objects.create(
                user=user,
                workspace=request.workspace,
                file_key=result["file_key"],
                file_name=result["original_filename"],
                file_size=uploaded_file.size,
            )

            serializer = ChatDocumentSerializer(chat_document)

            logger.info(
                f"Document uploaded: {file_name} by user={user.email} "
                f"in workspace={request.workspace.name}"
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            return Response(
                {"error": "An error occurred while uploading the document"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationCreateView(APIView):
    """
    POST /api/chat/conversations/
    Generate AI summary or plan for a document
    """

    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def post(self, request):
        """Create AI conversation (summary or plan)"""
        user = request.user

        # Validate workspace context
        if not hasattr(request, "workspace") or not request.workspace:
            logger.error(
                f"No workspace context for conversation creation by user={user.email}"
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        # Validate request data
        document_id = request.data.get("document_id")
        action_type = request.data.get("action_type")

        if not document_id:
            return Response(
                {"error": "document_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not action_type or action_type not in ["summary", "plan"]:
            return Response(
                {"error": 'action_type must be either "summary" or "plan"'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get document and verify ownership/workspace
            document = get_object_or_404(
                ChatDocument, id=document_id, user=user, workspace=request.workspace
            )

            # Process document and generate AI response
            logger.info(
                f"Generating {action_type} for document={document.file_name} "
                f"by user={user.email}"
            )

            extracted_text, ai_response = process_document_and_generate_response(
                file_key=document.file_key,
                file_name=document.file_name,
                action_type=action_type,
            )

            # Create AIConversation record
            conversation = AIConversation.objects.create(
                user=user,
                workspace=request.workspace,
                document=document,
                action_type=action_type,
                ai_response=ai_response,
                # title is auto-generated in model's save method
            )

            serializer = AIConversationSerializer(conversation)

            logger.info(
                f"AI conversation created: {conversation.title} "
                f"for user={user.email}"
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ChatDocument.DoesNotExist:
            return Response(
                {"error": "Document not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except DocumentProcessingError as e:
            logger.error(f"Document processing error: {str(e)}")
            return Response(
                {"error": f"Document processing failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AIServiceError as e:
            logger.error(f"AI service error: {str(e)}")
            return Response(
                {"error": f"AI generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            return Response(
                {"error": "An error occurred while generating AI response"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationListView(generics.ListAPIView):
    """
    GET /api/chat/conversations/
    List all conversations for the user in current workspace
    """

    serializer_class = AIConversationListSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        """Filter conversations by user and workspace"""
        user = self.request.user

        # Validate workspace context
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for conversation list by user={user.email}"
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        queryset = (
            AIConversation.objects.filter(user=user, workspace=self.request.workspace)
            .select_related("document")
            .order_by("-created_at")
        )

        logger.info(
            f"Fetching conversations for user={user.email}, "
            f"workspace={self.request.workspace.name}"
        )

        return queryset


class ConversationDetailView(generics.RetrieveAPIView):
    """
    GET /api/chat/conversations/{id}/
    Get specific conversation with full AI response
    """

    serializer_class = AIConversationSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        """Filter by user and workspace"""
        user = self.request.user

        # Validate workspace context
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for conversation detail by user={user.email}"
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        return AIConversation.objects.filter(
            user=user, workspace=self.request.workspace
        ).select_related("document")


class ConversationDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/chat/conversations/{id}/
    Delete a conversation
    """

    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        """Filter by user and workspace"""
        user = self.request.user

        # Validate workspace context
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            logger.error(
                f"No workspace context for conversation delete by user={user.email}"
            )
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        return AIConversation.objects.filter(
            user=user, workspace=self.request.workspace
        )

    def perform_destroy(self, instance):
        """Log deletion and remove conversation"""
        logger.info(
            f"Deleting conversation: {instance.title} "
            f"by user={self.request.user.email}"
        )
        instance.delete()


class SaveToNotesView(APIView):
    """
    POST /api/chat/conversations/{id}/save-notes/
    Mark conversation as saved to notes
    """

    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Set workspace context after authentication"""
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def post(self, request, pk):
        """Save AI conversation as a note in the notes app"""
        user = request.user

        # Validate workspace context
        if not hasattr(request, "workspace") or not request.workspace:
            logger.error(f"No workspace context for save-notes by user={user.email}")
            raise PermissionDenied(
                "Workspace context is required. Please provide X-Workspace-ID header."
            )

        try:
            # Get conversation and verify ownership/workspace
            conversation = get_object_or_404(
                AIConversation, id=pk, user=user, workspace=request.workspace
            )

            # Check if already saved to notes
            if conversation.saved_to_notes:
                return Response(
                    {"error": "This conversation has already been saved to notes"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Use transaction to ensure both operations succeed or fail together
            with transaction.atomic():
                # Create a new Note with the AI conversation content
                note = Note.objects.create(
                    owner=user,
                    workspace=request.workspace,
                    title=conversation.title,
                    content=conversation.ai_response,
                    tags=["ai-generated", conversation.action_type],
                )

                # Update saved_to_notes flag
                conversation.saved_to_notes = True
                conversation.save()

            serializer = AIConversationSerializer(conversation)

            logger.info(
                f"Conversation saved to notes: {conversation.title} "
                f"(note_id={note.id}) by user={user.email}"
            )

            return Response(
                {
                    "conversation": serializer.data,
                    "note_id": note.id,
                    "message": "Successfully saved to notes",
                },
                status=status.HTTP_200_OK,
            )

        except AIConversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error saving to notes: {str(e)}")
            return Response(
                {"error": "An error occurred while saving to notes"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
