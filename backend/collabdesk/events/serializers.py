from rest_framework import serializers
from .models import Event
from django.conf import settings
import pytz

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.start_time:
            # Convert to the target timezone and format with offset
            start_local = instance.start_time.astimezone(tz)
            data['start_time'] = start_local.isoformat()

        if instance.end_time:
            # Convert to the target timezone and format with offset
            end_local = instance.end_time.astimezone(tz)
            data['end_time'] = end_local.isoformat()

        return data
