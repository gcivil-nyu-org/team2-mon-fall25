from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from .models import Event, EventParticipant
from django.conf import settings
import pytz
from django.contrib.auth import get_user_model


class ConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Time conflict: overlapping event exists."
    default_code = "conflict"


class EventSerializer(serializers.ModelSerializer):
    # Make workspace read-only since it's set automatically from context
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    # Make created_by read-only since it's set automatically from request.user
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    # Add created_by_name to return the creator's full name
    created_by_name = serializers.SerializerMethodField(read_only=True)

    # Accept attendees as a list of user UUIDs (users.user_id)
    attendees = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    # Return attendees as a list of participant objects with names
    attendees_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["workspace", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        """Return the full_name of the user who created the event."""
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.username
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.start_time:
            # Convert to the target timezone and format with offset
            start_local = instance.start_time.astimezone(tz)
            data["start_time"] = start_local.isoformat()

        if instance.end_time:
            # Convert to the target timezone and format with offset
            end_local = instance.end_time.astimezone(tz)
            data["end_time"] = end_local.isoformat()

        # Ensure attendees_detail is present in representation
        try:
            data["attendees_detail"] = self.get_attendees_detail(instance)
        except Exception:
            pass
        return data

    def validate(self, data):
        request = self.context.get("request")
        if not request:
            return data

        user = request.user
        start = data.get("start_time")
        end = data.get("end_time")
        event_type = data.get("event_type")

        # Check for conflicts within the same workspace
        if (
            event_type == "INDIVIDUAL"
            and hasattr(request, "workspace")
            and request.workspace
        ):
            overlap = Event.objects.filter(
                created_by=user,
                workspace=request.workspace,
                start_time__lt=end,
                end_time__gt=start,
            ).exists()
            if overlap:
                raise ConflictException()
        return data

    def get_attendees_detail(self, obj):
        participants = (
            EventParticipant.objects.select_related("user")
            .filter(event=obj)
            .order_by("added_at")
        )
        result = []
        for p in participants:
            if p.user:
                result.append(
                    {
                        "id": p.user.id,
                        "user_id": getattr(p.user, "user_id", None),
                        "full_name": getattr(p.user, "full_name", ""),
                    }
                )
        return result

    def create(self, validated_data):
        # Extract attendees (prefer numeric user.id, fallback to user.user_id)
        raw_attendees = validated_data.pop("attendees", []) or []
        request = self.context.get("request")
        User = get_user_model()

        event = super().create(validated_data)

        if raw_attendees:
            numeric_ids = []
            uuid_like = []
            for v in raw_attendees:
                try:
                    # Accept numeric or numeric-as-string for User.pk
                    iv = int(str(v))
                    numeric_ids.append(iv)
                except (TypeError, ValueError):
                    # Non-numeric, treat as user.user_id (UUID string)
                    uuid_like.append(str(v))

            users_by_pk = (
                list(User.objects.filter(id__in=numeric_ids)) if numeric_ids else []
            )
            users_by_uuid = (
                list(User.objects.filter(user_id__in=uuid_like)) if uuid_like else []
            )

            # Deduplicate
            seen = set()
            users = []
            for u in users_by_pk + users_by_uuid:
                if u.id not in seen:
                    seen.add(u.id)
                    users.append(u)

            participants = [
                EventParticipant(
                    event=event,
                    user=u,
                    added_by=(
                        request.user if request and hasattr(request, "user") else u
                    ),
                    status="invited",
                )
                for u in users
            ]
            if participants:
                EventParticipant.objects.bulk_create(
                    participants, ignore_conflicts=True
                )

        return event


class EventParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventParticipant
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.added_at:
            # Convert to the target timezone and format with offset
            start_local = instance.added_at.astimezone(tz)
            data["added_at"] = start_local.isoformat()

        return data
