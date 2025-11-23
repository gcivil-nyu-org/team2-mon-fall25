from rest_framework import serializers
from .models import Note
from users.models import User


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    shared_with = UserMiniSerializer(many=True, read_only=True)

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
