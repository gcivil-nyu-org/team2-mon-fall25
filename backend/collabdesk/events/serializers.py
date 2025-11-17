from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from .models import Event, EventParticipant
from django.conf import settings
import pytz


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
