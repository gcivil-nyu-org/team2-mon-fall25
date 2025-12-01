from rest_framework import serializers
from .models import ChatDocument, AIConversation


class ChatDocumentSerializer(serializers.ModelSerializer):
    """Serializer for ChatDocument model"""

    class Meta:
        model = ChatDocument
        fields = [
            "id",
            "user",
            "workspace",
            "file_key",
            "file_name",
            "file_size",
            "uploaded_at",
        ]
        read_only_fields = ["id", "user", "uploaded_at"]


class AIConversationSerializer(serializers.ModelSerializer):
    """Detailed serializer for AIConversation with nested document info"""

    document = ChatDocumentSerializer(read_only=True)
    document_id = serializers.PrimaryKeyRelatedField(
        queryset=ChatDocument.objects.all(), source="document", write_only=True
    )

    class Meta:
        model = AIConversation
        fields = [
            "id",
            "user",
            "workspace",
            "document",
            "document_id",
            "action_type",
            "title",
            "ai_response",
            "saved_to_notes",
            "created_at",
        ]
        read_only_fields = ["id", "user", "title", "created_at"]


class AIConversationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing conversations"""

    document_name = serializers.CharField(source="document.file_name", read_only=True)

    class Meta:
        model = AIConversation
        fields = [
            "id",
            "workspace",
            "document_name",
            "action_type",
            "title",
            "saved_to_notes",
            "created_at",
        ]
        read_only_fields = fields
