from rest_framework import serializers
from .models import Workspace, WorkspaceMember, Role

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['name']

class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source='user.id')
    username = serializers.CharField(source='user.username')
    role = RoleSerializer()

    class Meta:
        model = WorkspaceMember
        fields = ['user_id', 'username', 'role', 'joined_at']

class WorkspaceSerializer(serializers.ModelSerializer):
    members = WorkspaceMemberSerializer(many=True, read_only=True)
    owner = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'workspace_id',
            'name',
            'description',
            'created_at',
            'owner',
            'members',
            'member_count'
        ]

    def get_owner(self, obj):
        return {
            "id": obj.created_by.id,
            "username": obj.created_by.username,
            "email": obj.created_by.email
        }

    def get_member_count(self, obj):
        return obj.members.count()
