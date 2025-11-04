from rest_framework import serializers
from .models import Workspace, WorkspaceMember, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["name"]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source="user.id")
    username = serializers.CharField(source="user.username")
    role = serializers.CharField()  # role is a CharField on the model, not a ForeignKey

    class Meta:
        model = WorkspaceMember
        fields = ["user_id", "username", "role", "joined_at"]


class WorkspaceSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "workspace_id",
            "name",
            "description",
            "created_at",
            "owner",
            "members",
            "member_count",
        ]

    def get_owner(self, obj):
        return {
            "id": obj.created_by.id,
            "username": obj.created_by.username,
            "email": obj.created_by.email,
        }

    def get_members(self, obj):
        members = obj.members.all()
        return WorkspaceMemberSerializer(members, many=True).data

    def get_member_count(self, obj):
        return obj.members.count()    

class WorkspaceCreateSerializer(serializers.ModelSerializer):
    members = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )

    class Meta:
        model = Workspace
        fields = [ "name", "description", "members"]
        read_only_fields = ["workspace_id"]

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        members = validated_data.pop("members", [])
        workspace = Workspace.objects.create(created_by=user, **validated_data)

        # Add the creator as the owner
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role="owner",
            is_active=True,
            invited_by=user,
        )

        # Add other members if any
        for member_id in members:
            try:
                if member_id == user.id:
                    continue
                WorkspaceMember.objects.create(
                    workspace=workspace,
                    user_id=member_id,
                    role="member",
                    is_active=True,
                    invited_by=user,
                )
            except Exception as e:
                print(f"Skipping invalid member ID {member_id}: {e}")
        return workspace
