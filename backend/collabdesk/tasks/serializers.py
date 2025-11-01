from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = "__all__"
            # "id",
            # "title",
            # "description",
            # "creator",
            # "assignee",
            # "status",
            # "priority",
            # "due_date",
            # "completed_at",
            # "archived",
            # "created_at",
            # "updated_at",
        
        read_only_fields = ["id", "created_at", "updated_at", "completed_at"]
