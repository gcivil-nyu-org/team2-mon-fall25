from rest_framework import serializers
from .models import Resource
from django.conf import settings
import pytz


class ResourceSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    size = serializers.IntegerField(read_only=True)

    class Meta:
        model = Resource
        fields = "__all__"
        read_only_fields = ["workspace", "size", "uploaded_by"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.uploaded:
            # Convert to the target timezone and format with offset
            uploaded_local = instance.uploaded.astimezone(tz)
            data["uploaded"] = uploaded_local.isoformat()

        return data
