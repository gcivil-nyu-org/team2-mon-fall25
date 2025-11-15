from rest_framework import serializers

# from torch import obj
from .models import Workspace, WorkspaceMember, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["name"]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source="user.id")
    username = serializers.CharField(source="user.username")
    role = serializers.CharField()  # role is a CharField on the model, not a ForeignKey
    full_name = serializers.CharField(source="user.full_name")

    class Meta:
        model = WorkspaceMember
        fields = ["user_id", "username", "role", "joined_at", "full_name"]


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
            "invite_code",
        ]

    def get_owner(self, obj):
        return {
            "id": obj.created_by.id,
            "username": obj.created_by.username,
            "email": obj.created_by.email,
            "full_name": obj.created_by.full_name,
        }

    def get_members(self, obj):
        members = obj.members.all()
        return WorkspaceMemberSerializer(members, many=True).data

    def get_member_count(self, obj):
        return obj.members.count()


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    members = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )

    class Meta:
        model = Workspace
        fields = ["name", "description", "members"]
        read_only_fields = ["workspace_id"]

    def create(self, validated_data):
        request = self.context["request"]
        creator = request.user
        members = validated_data.pop("members", [])
        workspace = Workspace.objects.create(created_by=creator, **validated_data)

        # Add the creator as the owner
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=creator,
            role="owner",
            is_active=True,
            invited_by=creator,
        )

        # Add other members (resolve by user_id field)
        from django.contrib.auth import get_user_model

        User = get_user_model()

        for member_user_id in members:
            try:
                if str(member_user_id) == str(creator.user_id):
                    continue  # Skip creator

                # Find user by user_id (UUID or string)
                member = User.objects.get(user_id=member_user_id)

                # Add as workspace member
                WorkspaceMember.objects.create(
                    workspace=workspace,
                    user=member,
                    role="member",
                    is_active=True,
                    invited_by=creator,
                )
                print(f"Added member: {member.email}")

            except User.DoesNotExist:
                print(f"Skipping invalid user_id: {member_user_id}")
            except Exception as e:
                print(f"Error adding member {member_user_id}: {e}")

        return workspace


class WorkspaceJoinSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=12)

    def validate_invite_code(self, value):
        value = value.upper().strip()
        try:
            workspace = Workspace.objects.get(invite_code=value)
        except Workspace.DoesNotExist:
            raise serializers.ValidationError("Invalid invite code")
        return value

    def save(self, **kwargs):
        request = self.context["request"]
        user = request.user
        invite_code = self.validated_data["invite_code"]

        workspace = Workspace.objects.get(invite_code=invite_code)

        # Already member?
        if WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            return workspace

        # Add new member
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role="member",
            invited_by=None,
            is_active=True,
        )

        return workspace
