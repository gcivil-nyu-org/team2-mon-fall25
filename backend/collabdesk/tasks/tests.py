from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from django.utils import timezone  # Keep this import for good practice

from .views import TaskViewSet
from .models import Task
from workspaces.models import Workspace, WorkspaceMember

# Fix the relative imports that caused the previous error (ImportError)

User = get_user_model()


class TaskViewSetTests(TestCase):
    def setUp(self):
        # Use APIRequestFactory to create DRF-compatible requests
        self.factory = APIRequestFactory()

        # 1. Create a User
        self.user = User.objects.create_user(
            username="testuser@example.com",
            email="testuser@example.com",
            password="testpass123",
        )

        # 2. Create a Workspace
        self.workspace = Workspace.objects.create(
            name="Test Workspace", created_by=self.user
        )

        # 3. Add user to workspace (required for permissions)
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )

        # 4. Create a Task
        self.task = Task.objects.create(
            title="Task for Retrieval",
            status=Task.Status.TODO,
            workspace=self.workspace,
            created_by=self.user,
        )

    # --- HELPER METHOD TO SET UP REQUEST CONTEXT ---
    def _create_request_context(self, method, url, data=None):
        """Creates a request, authenticates it, and adds workspace context."""

        # Create the request using the DRF factory
        request = getattr(self.factory, method.lower())(url, data)

        # Authenticate the user
        force_authenticate(request, user=self.user)

        # Add the necessary workspace context that your views/permissions expect
        request.workspace = self.workspace

        return request

    # --- VERY BASIC COVERAGE TESTS ---

    def test_list_tasks_success(self):
        """Test listing all tasks (GET /api/tasks/)"""
        view = TaskViewSet.as_view({"get": "list"})
        request = self._create_request_context("GET", "/api/tasks/")
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that the test task is included in the response
        self.assertEqual(len(response.data), 1)

    def test_create_task_success(self):
        """Test creating a new task (POST /api/tasks/)"""
        view = TaskViewSet.as_view({"post": "create"})
        data = {
            "title": "New Task",
            "status": Task.Status.TODO,
            "priority": 2,
            "assigned_to": self.user.pk,  # Assumes the field is 'assigned_to' and takes user ID
            "dependencies": [],  # Must provide an empty list if required
        }
        request = self._create_request_context("POST", "/api/tasks/", data=data)
        response = view(request)
        if response.status_code != status.HTTP_201_CREATED:
            print("--- Serializer Validation Error ---")
            print(response.data)
            print("-----------------------------------")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "New Task")

    def test_retrieve_task_success(self):
        """Test retrieving a single task (GET /api/tasks/{pk}/)"""
        view = TaskViewSet.as_view({"get": "retrieve"})
        request = self._create_request_context("GET", f"/api/tasks/{self.task.pk}/")
        response = view(request, pk=self.task.pk)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Task for Retrieval")

    def test_update_task_title_success(self):
        """Test partially updating a task (PATCH /api/tasks/{pk}/)"""
        view = TaskViewSet.as_view({"patch": "partial_update"})
        update_data = {"title": "Updated Title"}

        request = self._create_request_context(
            "PATCH", f"/api/tasks/{self.task.pk}/", data=update_data
        )
        response = view(request, pk=self.task.pk)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, "Updated Title")

    def test_delete_task_success(self):
        """Test deleting a task (DELETE /api/tasks/{pk}/)"""
        view = TaskViewSet.as_view({"delete": "destroy"})

        request = self._create_request_context("DELETE", f"/api/tasks/{self.task.pk}/")
        response = view(request, pk=self.task.pk)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Verify the task no longer exists
        self.assertFalse(Task.objects.filter(pk=self.task.pk).exists())

    def test_archive_action_success(self):
        """Covers the custom @action archive"""
        view = TaskViewSet.as_view({"post": "archive"})

        request = self._create_request_context(
            "POST", f"/api/tasks/{self.task.pk}/archive/"
        )
        response = view(request, pk=self.task.pk)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertTrue(self.task.archived)
