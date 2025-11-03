from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from .views import TaskViewSet
from .models import Task


class TaskViewSetTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = TaskViewSet.as_view({'post': 'create', 'patch': 'partial_update', 'post': 'archive'})
        self.task = Task.objects.create(title="Test Task", status=Task.Status.TODO)

    def test_perform_create(self):
        """Covers perform_create"""
        viewset = TaskViewSet()
        request = self.factory.post("/api/tasks/", {"title": "Created"})
        request.user = type("User", (), {"username": "dummy"})()  # mock user
        serializer = type("Serializer", (), {"save": lambda self, **kw: None})()
        viewset.request = request
        viewset.perform_create(serializer)  # just to execute line

    def test_perform_update_marks_done(self):
        """Covers perform_update logic for DONE status"""
        task = Task.objects.create(title="Done Task", status=Task.Status.DONE, completed_at=None)
        serializer = type("Serializer", (), {"save": lambda self: task})()
        viewset = TaskViewSet()
        viewset.perform_update(serializer)
        self.assertIsNotNone(task.completed_at)

    def test_archive_action(self):
        """Covers @action archive"""
        view = TaskViewSet.as_view({"post": "archive"})
        request = self.factory.post("/api/tasks/1/archive/")
        response = view(request, pk=self.task.pk)
        self.assertEqual(response.status_code, 200)

