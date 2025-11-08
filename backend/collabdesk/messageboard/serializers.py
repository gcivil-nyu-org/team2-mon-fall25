# messageboard/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Message, Reaction

User = get_user_model()


class SimpleUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='username')

    class Meta:
        model = User
        fields = ['id', 'name']


class ReactionUserListSerializer(serializers.Serializer):
    emoji = serializers.CharField()
    users = SimpleUserSerializer(many=True)


class MessageSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(source='author', read_only=True)
    replies = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id',
            'user',
            'content',
            'parent',
            'createdAt',
            'updatedAt',
            'deleted',
            'replies',
            'reactions',
        ]

    def get_replies(self, obj):
        replies = obj.replies.all().order_by('created_at')
        return MessageSerializer(replies, many=True, context=self.context).data

    def get_reactions(self, obj):
        # Convert to frontend’s expected shape:
        # [{ emoji: "👍", users: [{id, name}, ...] }]
        reaction_groups = {}
        for reaction in obj.reactions.select_related('user'):
            emoji = reaction.reaction_type
            if emoji not in reaction_groups:
                reaction_groups[emoji] = []
            reaction_groups[emoji].append(reaction.user)

        formatted = [
            {'emoji': emoji, 'users': SimpleUserSerializer(users, many=True).data}
            for emoji, users in reaction_groups.items()
        ]
        return formatted
