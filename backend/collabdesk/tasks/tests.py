from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from django.utils import timezone  # Keep this import for good practice
from .serializers import TaskSerializer
from datetime import date, timedelta
from django.test import override_settings

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

    def test_workspace_members_returns_users(self):
        view = TaskViewSet.as_view({"get": "workspace_members"})
        request = self._create_request_context("GET", "/api/tasks/workspace-members/")
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)
        self.assertEqual(response.data[0]["email"], self.user.email)

    def test_workspace_members_without_workspace(self):
        view = TaskViewSet.as_view({"get": "workspace_members"})
        request = self._create_request_context("GET", "/api/tasks/workspace-members/")
        del request.workspace  # remove workspace context
        response = view(request)

        # DRF returns 403 Forbidden when PermissionDenied is raised
        self.assertEqual(response.status_code, 403)

    def test_available_tasks_returns_tasks(self):
        task2 = Task.objects.create(
            title="Another Task",
            status=Task.Status.TODO,
            workspace=self.workspace,
            created_by=self.user,
        )
        view = TaskViewSet.as_view({"get": "available_tasks"})
        request = self._create_request_context("GET", "/api/tasks/available-tasks/")
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(t["id"] == task2.id for t in response.data))

    def test_available_tasks_with_exclude_id(self):
        view = TaskViewSet.as_view({"get": "available_tasks"})  # use method name here
        request = self._create_request_context(
            "GET", f"/api/tasks/available-tasks/?exclude_id={self.task.id}"
        )
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(any(t["id"] == self.task.id for t in response.data))

    def test_archive_task_sets_archived_true(self):
        view = TaskViewSet.as_view({"post": "archive"})
        request = self._create_request_context(
            "POST", f"/api/tasks/{self.task.id}/archive/"
        )
        response = view(request, pk=self.task.id)
        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertTrue(self.task.archived)

    def test_create_task_without_workspace_context(self):
        """Creating a task without workspace should return 403"""
        view = TaskViewSet.as_view({"post": "create"})
        data = {"title": "No Workspace Task", "status": Task.Status.TODO}

        request = self._create_request_context("POST", "/api/tasks/", data=data)
        del request.workspace  # remove workspace context

        response = view(request)
        self.assertEqual(response.status_code, 403)

    def test_update_status_done_with_incomplete_dependencies(self):
        """Cannot mark task as DONE if dependencies are incomplete"""
        dep = Task.objects.create(
            title="Dep Task",
            status=Task.Status.TODO,
            workspace=self.workspace,
            created_by=self.user,
        )
        self.task.dependencies.add(dep)

        view = TaskViewSet.as_view({"patch": "partial_update"})
        request = self._create_request_context(
            "PATCH", f"/api/tasks/{self.task.id}/", data={"status": Task.Status.DONE}
        )
        response = view(request, pk=self.task.id)

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.data)
        self.assertIn("dependencies", str(response.data["status"]))

    def test_update_status_done_sets_completed_at(self):
        """Marking a task as DONE sets completed_at timestamp automatically"""
        self.task.dependencies.clear()  # ensure no blocking dependencies
        view = TaskViewSet.as_view({"patch": "partial_update"})
        request = self._create_request_context(
            "PATCH", f"/api/tasks/{self.task.id}/", data={"status": Task.Status.DONE}
        )

        response = view(request, pk=self.task.id)
        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.completed_at)

    def test_update_status_from_done_clears_completed_at(self):
        """Changing status from DONE to another clears completed_at"""
        self.task.status = Task.Status.DONE
        self.task.completed_at = timezone.now()
        self.task.save()

        view = TaskViewSet.as_view({"patch": "partial_update"})
        request = self._create_request_context(
            "PATCH", f"/api/tasks/{self.task.id}/", data={"status": Task.Status.TODO}
        )
        response = view(request, pk=self.task.id)

        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertIsNone(self.task.completed_at)

    def test_queryset_filters_by_workspace(self):
        """Tasks returned by get_queryset are only from current workspace"""
        other_ws = Workspace.objects.create(name="Other WS", created_by=self.user)
        other_task = Task.objects.create(
            title="Other Task",
            workspace=other_ws,
            created_by=self.user,
            status=Task.Status.TODO,
        )

        view = TaskViewSet.as_view({"get": "list"})
        request = self._create_request_context("GET", "/api/tasks/")
        response = view(request)

        task_ids = [t["id"] for t in response.data]
        self.assertIn(self.task.id, task_ids)
        self.assertNotIn(other_task.id, task_ids)

    def test_list_tasks_with_search_filter(self):
        """Search filter should return matching tasks"""
        view = TaskViewSet.as_view({"get": "list"})
        request = self._create_request_context("GET", "/api/tasks/?search=Retrieval")
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], self.task.title)

    def test_list_tasks_with_ordering(self):
        """Ordering tasks by priority works"""
        Task.objects.create(
            title="High Priority",
            status=Task.Status.TODO,
            priority=10,
            workspace=self.workspace,
            created_by=self.user,
        )

        view = TaskViewSet.as_view({"get": "list"})
        request = self._create_request_context("GET", "/api/tasks/?ordering=-priority")
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["priority"], 10)


class TaskSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u@test.com", email="u@test.com", password="pass123"
        )

        self.workspace = Workspace.objects.create(name="WS", created_by=self.user)

        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.user, role="owner"
        )

        self.task1 = Task.objects.create(
            title="Task 1",
            workspace=self.workspace,
            created_by=self.user,
            status=Task.Status.TODO,
        )

        self.task2 = Task.objects.create(
            title="Task 2",
            workspace=self.workspace,
            created_by=self.user,
            status=Task.Status.TODO,
        )

    # -------------------------------
    # BASIC SERIALIZER CREATION TEST
    # -------------------------------
    def test_serializer_creates_task(self):
        data = {
            "title": "Created From Serializer",
            "status": Task.Status.TODO,
            "assignee": self.user.id,
            "dependencies": [self.task1.id],
        }

        serializer = TaskSerializer(data=data, context={"workspace": self.workspace})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        task = serializer.save(workspace=self.workspace, created_by=self.user)
        self.assertEqual(task.title, "Created From Serializer")
        self.assertIn(self.task1, task.dependencies.all())

    # -------------------------------
    # SELF-DEPENDENCY VALIDATION
    # -------------------------------
    def test_cannot_depend_on_itself(self):
        data = {
            "title": "Invalid",
            "status": Task.Status.TODO,
            "dependencies": [self.task1.id],
        }

        serializer = TaskSerializer(instance=self.task1, data=data, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("dependencies", serializer.errors)

    # -------------------------------
    # CIRCULAR DEPENDENCY VALIDATION
    # -------------------------------
    def test_circular_dependency_detection(self):
        A = self.task1
        B = self.task2
        C = Task.objects.create(
            title="Task C",
            workspace=self.workspace,
            created_by=self.user,
            status=Task.Status.TODO,
        )

        # Build DFS-reachable chain (reverse direction)
        #
        # B → C
        # C → A
        #
        # Now adding B → A should create cycle:
        # A ← C ← B  AND  B → A
        #
        # Valid cycle.

        B.dependencies.add(C)  # B depends on C
        C.dependencies.add(A)  # C depends on A

        # Now try: B depends on A (creates loop)
        data = {"dependencies": [A.id]}

        serializer = TaskSerializer(instance=B, data=data, partial=True)

        valid = serializer.is_valid()
        print("VALID:", valid)
        print("ERRORS:", serializer.errors)

        self.assertFalse(valid)
        self.assertIn("dependencies", serializer.errors)

    # -------------------------------
    # NON-CIRCULAR VALID DEPENDENCIES
    # -------------------------------
    def test_valid_dependency(self):
        data = {"dependencies": [self.task1.id]}

        serializer = TaskSerializer(instance=self.task2, data=data, partial=True)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    # -------------------------------
    # dependency_details FIELD
    # -------------------------------
    def test_dependency_details_is_read_only(self):
        self.task2.dependencies.add(self.task1)

        serializer = TaskSerializer(instance=self.task2)

        # Ensure dependency_details exists and is correct
        details = serializer.data["dependency_details"]
        self.assertEqual(len(details), 1)
        self.assertEqual(details[0]["id"], self.task1.id)

    # -------------------------------
    # can_complete FIELD READ-ONLY
    # -------------------------------
    def test_can_complete_read_only(self):
        serializer = TaskSerializer(instance=self.task1)
        self.assertIn("can_complete", serializer.data)
        # Basic sanity check: Boolean
        self.assertIsInstance(serializer.data["can_complete"], bool)


@override_settings(SECURE_SSL_REDIRECT=False)
class TaskSummaryViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="password",
        )

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="otheruser@example.com",
            password="password",
        )

        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            created_by=self.user,
        )

        self.other_workspace = Workspace.objects.create(
            name="Other Workspace",
            created_by=self.user,
        )
        self.url = "/api/summary/"

        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url, {"workspace": self.workspace.workspace_id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_workspace_param(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"], "workspace query param is required")

    def test_empty_tasks(self):
        res = self.client.get(self.url, {"workspace": self.workspace.pk})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total"], 0)
        self.assertEqual(res.data["completed"], 0)
        self.assertEqual(res.data["inProgress"], 0)
        self.assertEqual(res.data["overdue"], 0)
        self.assertEqual(res.data["dueToday"], 0)
        self.assertEqual(res.data["completionPercentage"], 0)

    def test_task_summary_counts(self):
        today = date.today()

        Task.objects.create(
            title="Done task",
            assignee=self.user,
            workspace=self.workspace,
            status="done",
        )

        Task.objects.create(
            title="In progress today",
            assignee=self.user,
            workspace=self.workspace,
            status="in-progress",
            due_date=today,
        )

        Task.objects.create(
            title="Overdue task",
            assignee=self.user,
            workspace=self.workspace,
            status="todo",
            due_date=today - timedelta(days=1),
        )

        Task.objects.create(
            title="No due date",
            assignee=self.user,
            workspace=self.workspace,
            status="todo",
        )

        Task.objects.create(
            title="Other workspace",
            assignee=self.user,
            workspace=self.other_workspace,
            status="todo",
            due_date=today - timedelta(days=1),
        )

        res = self.client.get(self.url, {"workspace": self.workspace.pk})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data

        self.assertEqual(data["total"], 4)
        self.assertEqual(data["completed"], 1)
        self.assertEqual(data["inProgress"], 1)
        self.assertEqual(data["overdue"], 1)
        self.assertEqual(data["dueToday"], 1)
        self.assertEqual(data["completionPercentage"], 25.0)
