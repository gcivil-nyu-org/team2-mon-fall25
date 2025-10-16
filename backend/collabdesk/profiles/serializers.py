from rest_framework import serializers
from .models import Profile
from django.conf import settings
import pytz

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.created_at:
            # Convert to the target timezone and format with offset
            end_local = instance.created_at.astimezone(tz)
            data['created_at'] = end_local.isoformat()

        return data
