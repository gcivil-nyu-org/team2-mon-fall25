from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task
from .serializers import TaskSerializer

# from .permissions import IsCreatorOrReadOnly


class TaskViewSet(viewsets.ModelViewSet):
    """
    Provides list, retrieve, create, update, partial_update, destroy.
    """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    # permission_classes = [IsCreatorOrReadOnly]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["title", "description"]
    ordering_fields = ["priority", "due_date", "created_at", "updated_at"]
    filterset_fields = ["status", "priority", "assignee", "creator", "archived"]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def perform_update(self, serializer):
        obj = serializer.save()
        # set completed_at automatically when status is DONE and completed_at not set
        if obj.status == Task.Status.DONE and obj.completed_at is None:
            import django.utils.timezone as tz

            obj.completed_at = tz.now()
            obj.save()

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        task = self.get_object()
        task.archived = True
        task.save()
        return Response({"status": "archived"})
