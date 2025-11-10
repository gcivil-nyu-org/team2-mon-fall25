from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from .views import TaskViewSet
from .models import Task
from workspaces.models import Workspace, WorkspaceMember

User = get_user_model()


class TaskViewSetTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = TaskViewSet.as_view(
            {"get": "create", "patch": "partial_update", "post": "archive"}
        )
        # Create a real user and workspace for testing
        self.user = User.objects.create_user(
            username="testuser@example.com",
            email="testuser@example.com",
            password="testpass123",
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )
        # Add user to workspace
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )
        self.task = Task.objects.create(
            title="Test Task",
            status=Task.Status.TODO,
            workspace=self.workspace,
            created_by=self.user,
        )

    def test_perform_create(self):
        """Covers perform_create"""
        viewset = TaskViewSet()
        request = self.factory.post("/api/tasks/", {"title": "Created"})
        request.user = self.user
        request.workspace = self.workspace  # Add workspace context
        serializer = type("Serializer", (), {"save": lambda self, **kw: None})()
        viewset.request = request
        viewset.perform_create(serializer)  # just to execute line

    def test_perform_update_marks_done(self):
        """Covers perform_update logic for DONE status"""
        task = Task.objects.create(
            title="Done Task",
            status=Task.Status.DONE,
            completed_at=None,
            workspace=self.workspace,
            created_by=self.user,
        )
        serializer = type("Serializer", (), {"save": lambda self: task})()
        viewset = TaskViewSet()
        viewset.perform_update(serializer)
        self.assertIsNotNone(task.completed_at)

    def test_archive_action(self):
        """Covers @action archive"""
        view = TaskViewSet.as_view({"post": "archive"})
        request = self.factory.post("/api/tasks/1/archive/")
        force_authenticate(request, user=self.user)
        request.workspace = self.workspace  # Add workspace context
        response = view(request, pk=self.task.pk)
        self.assertEqual(response.status_code, 200)
