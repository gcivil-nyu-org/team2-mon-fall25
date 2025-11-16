import io
import json
import tempfile
from unittest.mock import patch, MagicMock

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from users.models import User
from workspaces.models import Workspace, WorkspaceMember
from .models import Resource, Tag


@override_settings(
    DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage",
)
class ResourceAPITests(APITestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

        self.media_root = self.tmpdir.name

        # Ensure MEDIA_ROOT points to a temp directory for file writes
        self._media_override = override_settings(MEDIA_ROOT=self.media_root)
        self._media_override.enable()
        self.addCleanup(self._media_override.disable)

        # Create user and authenticate
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="password123",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create two workspaces and memberships
        self.ws1 = Workspace.objects.create(name="WS1", created_by=self.user)
        self.ws2 = Workspace.objects.create(name="WS2", created_by=self.user)
        WorkspaceMember.objects.create(workspace=self.ws1, user=self.user, role="owner")
        WorkspaceMember.objects.create(
            workspace=self.ws2, user=self.user, role="member"
        )

        self.list_url = reverse("resources:resource-list")

    def test_create_resource_with_tags(self):
        # Prepare file
        content = b"hello file content"
        uploaded_file = SimpleUploadedFile(
            "test.pdf", content, content_type="application/pdf"
        )

        tags = ["marketing", "q4"]

        response = self.client.post(
            self.list_url,
            data={
                "name": "Q4 Plan",
                "type": "PDF",
                "file": uploaded_file,
                "tags": json.dumps(tags),  # multipart: send as JSON string
            },
            format="multipart",
            HTTP_X_WORKSPACE_ID=str(self.ws1.workspace_id),
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED, response.content
        )
        data = response.json()
        self.assertEqual(data["name"], "Q4 Plan")
        self.assertEqual(data["type"], "PDF")
        self.assertEqual(sorted(data.get("tags", [])), sorted(tags))

        # Verify DB record
        res = Resource.objects.get(profile_id=data["profile_id"])
        self.assertEqual(res.workspace, self.ws1)
        self.assertEqual(res.uploaded_by, self.user)
        self.assertEqual(res.size, len(content))
        self.assertEqual(
            sorted(list(res.tags.values_list("name", flat=True))), sorted(tags)
        )

    def test_list_resources_scoped_to_workspace(self):
        # Create resources in two workspaces
        r1 = Resource.objects.create(
            name="Doc1",
            type="PDF",
            size=0,
            uploaded_by=self.user,
            workspace=self.ws1,
        )
        r2 = Resource.objects.create(
            name="Doc2",
            type="DOCX",
            size=0,
            uploaded_by=self.user,
            workspace=self.ws2,
        )

        resp_ws1 = self.client.get(
            self.list_url, HTTP_X_WORKSPACE_ID=str(self.ws1.workspace_id)
        )
        self.assertEqual(resp_ws1.status_code, status.HTTP_200_OK)
        ids_ws1 = {obj["profile_id"] for obj in resp_ws1.json()}
        self.assertIn(str(r1.profile_id), ids_ws1)
        self.assertNotIn(str(r2.profile_id), ids_ws1)

        resp_ws2 = self.client.get(
            self.list_url, HTTP_X_WORKSPACE_ID=str(self.ws2.workspace_id)
        )
        self.assertEqual(resp_ws2.status_code, status.HTTP_200_OK)
        ids_ws2 = {obj["profile_id"] for obj in resp_ws2.json()}
        self.assertIn(str(r2.profile_id), ids_ws2)
        self.assertNotIn(str(r1.profile_id), ids_ws2)

    def test_create_without_workspace_header_is_forbidden(self):
        content = b"x"
        uploaded_file = SimpleUploadedFile("a.txt", content, content_type="text/plain")
        response = self.client.post(
            self.list_url,
            data={"name": "A", "type": "TXT", "file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def _create_file_resource(self, ws):
        # Helper to create a stored file via API in ws
        content = b"downloadable content"
        uploaded_file = SimpleUploadedFile(
            "dl.pdf", content, content_type="application/pdf"
        )
        resp = self.client.post(
            self.list_url,
            data={
                "name": "Download Me",
                "type": "PDF",
                "file": uploaded_file,
            },
            format="multipart",
            HTTP_X_WORKSPACE_ID=str(ws.workspace_id),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        return resp.json()

    def test_patch_update_name_and_tags(self):
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])
        new_name = "Renamed Doc"
        new_tags = ["design", "review"]

        resp = self.client.patch(
            detail_url,
            data=json.dumps({"name": new_name, "tags": new_tags}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        data = resp.json()
        self.assertEqual(data["name"], new_name)
        self.assertEqual(sorted(data.get("tags", [])), sorted(new_tags))

        # Verify DB
        res = Resource.objects.get(profile_id=created["profile_id"])
        self.assertEqual(res.name, new_name)
        self.assertEqual(
            sorted(list(res.tags.values_list("name", flat=True))), sorted(new_tags)
        )

    # def test_download_local_filesystem(self):
    #     created = self._create_file_resource(self.ws1)
    #     download_url = reverse(
    #         "resources:resource-download", args=[created["profile_id"]]
    #     )

    #     resp = self.client.get(download_url)
    #     self.assertEqual(resp.status_code, status.HTTP_200_OK)
    #     # DRF wraps FileResponse, check headers
    #     disposition = resp.get("Content-Disposition", "")
    #     self.assertIn("attachment;", disposition)
    #     self.assertIn("dl.pdf", disposition)

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="test-bucket", AWS_S3_REGION_NAME="us-east-1"
    )
    @patch("resources.views.boto3.client")
    def test_download_s3_presigned_url(self, mock_boto_client):
        # Prepare: create resource pointing to a key path
        created = self._create_file_resource(self.ws1)
        download_url = reverse(
            "resources:resource-download", args=[created["profile_id"]]
        )

        # Mock boto3 client and presigned URL
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = (
            "https://example.com/presigned"
        )
        mock_boto_client.return_value = mock_client

        resp = self.client.get(download_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        body = resp.json()
        self.assertEqual(body.get("url"), "https://example.com/presigned")
