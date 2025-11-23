from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "content",
            "tags",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "is_shared",
            "shared_with",
        ]

    def get_created_by(self, obj):
        user = obj.owner
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }
