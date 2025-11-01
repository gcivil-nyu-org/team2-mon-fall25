from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from .models import Event
from django.conf import settings
import pytz


class ConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Time conflict: overlapping event exists."
    default_code = "conflict"


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"

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
        user = self.context["request"].user
        start = data.get("start_time")
        end = data.get("end_time")
        event_type = data.get("event_type")

        if event_type == "INDIVIDUAL":
            overlap = Event.objects.filter(
                created_by=user, start_time__lt=end, end_time__gt=start
            ).exists()
            if overlap:
                raise ConflictException()
        return data
