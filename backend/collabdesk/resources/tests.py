import io
import json
import tempfile
import os
import uuid
from unittest.mock import patch, MagicMock
import logging

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from users.models import User
from workspaces.models import Workspace, WorkspaceMember
from .models import Resource, Tag
from .serializers import ResourceSerializer
from .s3_utils import (
    get_s3_client,
    upload_file_to_s3,
    download_file_from_s3,
    delete_file_from_s3,
    list_files_in_s3,
)
from botocore.exceptions import ClientError, NoCredentialsError


@override_settings(
    DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage",
)
class ResourceAPITests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Suppress logging during tests to keep output clean
        logging.disable(logging.CRITICAL)

    @classmethod
    def tearDownClass(cls):
        # Re-enable logging after tests
        logging.disable(logging.NOTSET)
        super().tearDownClass()

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

        # Patch S3 upload
        self.upload_patcher = patch("resources.serializers.upload_file_to_s3")
        self.mock_upload = self.upload_patcher.start()
        self.mock_upload.return_value = {
            "success": True,
            "file_key": "mock_file_key",
            "url": "http://mock-s3-url/mock_file_key",
            "original_filename": "mock_filename",
        }
        self.addCleanup(self.upload_patcher.stop)

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
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["url"], "https://example.com/presigned")

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="test-bucket", AWS_S3_REGION_NAME="us-east-1"
    )
    @patch("resources.views.boto3.client")
    def test_preview_s3_presigned_url(self, mock_boto_client):
        # Prepare: create resource pointing to a key path
        created = self._create_file_resource(self.ws1)
        preview_url = reverse(
            "resources:resource-preview", args=[created["profile_id"]]
        )

        # Mock boto3 client and presigned URL
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = (
            "https://example.com/presigned-preview"
        )
        mock_boto_client.return_value = mock_client

        resp = self.client.get(preview_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["url"], "https://example.com/presigned-preview")

        # Verify generate_presigned_url was called with correct params
        args, kwargs = mock_client.generate_presigned_url.call_args
        self.assertEqual(kwargs["ClientMethod"], "get_object")
        self.assertIn("ResponseContentDisposition", kwargs["Params"])
        self.assertIn("inline", kwargs["Params"]["ResponseContentDisposition"])

    @patch("resources.views.delete_file_from_s3")
    def test_delete_resource(self, mock_delete_s3):
        mock_delete_s3.return_value = {"success": True}
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])

        resp = self.client.delete(detail_url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

        # Verify DB record is gone
        self.assertFalse(
            Resource.objects.filter(profile_id=created["profile_id"]).exists()
        )

        # Verify S3 delete was called
        mock_delete_s3.assert_called_once()

    def test_create_resource_auto_detect_type(self):
        # Update mock to return a key with extension so auto-detect works
        self.mock_upload.return_value = {
            "success": True,
            "file_key": "mock_file_key.png",
            "url": "http://mock-s3-url/mock_file_key.png",
            "original_filename": "image.png",
        }

        content = b"image content"
        uploaded_file = SimpleUploadedFile(
            "image.png", content, content_type="image/png"
        )

        resp = self.client.post(
            self.list_url,
            data={
                "name": "My Image",
                # "type": "PNG",  <-- Omitted, should be auto-detected
                "file": uploaded_file,
            },
            format="multipart",
            HTTP_X_WORKSPACE_ID=str(self.ws1.workspace_id),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertEqual(data["type"], "PNG")

    def test_create_resource_s3_upload_failure(self):
        # Simulate S3 upload failure
        self.mock_upload.return_value = {"success": False, "error": "S3 unavailable"}

        content = b"content"
        uploaded_file = SimpleUploadedFile(
            "test.txt", content, content_type="text/plain"
        )

        resp = self.client.post(
            self.list_url,
            data={
                "name": "Failed Upload",
                "type": "TXT",
                "file": uploaded_file,
            },
            format="multipart",
            HTTP_X_WORKSPACE_ID=str(self.ws1.workspace_id),
        )
        # Should fail validation
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Failed to upload file", str(resp.content))

    def test_resource_serialization_details(self):
        # Create a user without full name
        user2 = User.objects.create_user(username="user2", password="pw")

        # Create resource
        r = Resource.objects.create(
            name="R", type="TXT", size=10, uploaded_by=user2, workspace=self.ws1
        )

        serializer = ResourceSerializer(r)
        data = serializer.data

        # Check uploaded_by falls back to username
        self.assertEqual(data["uploaded_by"], "user2")

        # Check uploaded_by_id
        self.assertEqual(data["uploaded_by_id"], user2.id)

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_download_local_filesystem(self):
        # Create a resource with a real file on disk
        content = b"local file content"
        # We need to manually create the file in the media root because the serializer
        # is patched to mock S3 upload.

        # Create a file in the temp media root
        filename = "local_test.txt"
        with open(os.path.join(self.media_root, filename), "wb") as f:
            f.write(content)

        # Create resource record pointing to this file
        r = Resource.objects.create(
            name="Local Doc",
            type="TXT",
            size=len(content),
            uploaded_by=self.user,
            workspace=self.ws1,
            file=filename,  # This path is relative to MEDIA_ROOT
        )

        download_url = reverse(
            "resources:resource-download", args=[r.profile_id]
        )

        resp = self.client.get(download_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # FileResponse streams content
        self.assertEqual(b"".join(resp.streaming_content), content)
        self.assertIn('attachment; filename="local_test.txt"', resp.get("Content-Disposition"))

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_preview_local_filesystem(self):
        # Create a resource with a real file on disk
        content = b"local preview content"
        filename = "preview_test.txt"
        with open(os.path.join(self.media_root, filename), "wb") as f:
            f.write(content)

        r = Resource.objects.create(
            name="Local Preview",
            type="TXT",
            size=len(content),
            uploaded_by=self.user,
            workspace=self.ws1,
            file=filename
        )

        preview_url = reverse(
            "resources:resource-preview", args=[r.profile_id]
        )

        resp = self.client.get(preview_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(resp.streaming_content), content)
        # Should be inline
        self.assertNotIn('attachment;', resp.get("Content-Disposition", ""))

    def test_upload_file_view(self):
        # Test the standalone upload_file view
        url = reverse("resources:upload")
        content = b"standalone upload"
        uploaded_file = SimpleUploadedFile(
            "standalone.txt", content, content_type="text/plain"
        )

        # We need to mock upload_file_to_s3 for this view as well,
        # but it's imported directly in views.py, so we need to patch it there.
        with patch("resources.views.upload_file_to_s3") as mock_upload:
            mock_upload.return_value = {
                "success": True,
                "file_key": "standalone_key.txt",
                "url": "http://s3/standalone_key.txt",
                "original_filename": "standalone.txt"
            }

            resp = self.client.post(
                url,
                {"file": uploaded_file, "workspace_id": self.ws1.workspace_id},
                format="multipart"
            )
            self.assertEqual(resp.status_code, 201)
            data = resp.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["file_key"], "standalone_key.txt")

            # Verify resource created
            self.assertTrue(Resource.objects.filter(file="standalone_key.txt").exists())

    def test_download_file_view(self):
        # Test the standalone download_file view
        # It takes a file_key which can be a UUID or S3 key
        
        # Case 1: UUID
        r = Resource.objects.create(
            name="DL View",
            type="TXT",
            size=10,
            uploaded_by=self.user,
            workspace=self.ws1,
            file="s3_key_for_dl.txt"
        )
        
        url = reverse("resources:download", args=[r.profile_id])
        
        with patch("resources.views.download_file_from_s3") as mock_dl:
            mock_dl.return_value = {
                "success": True,
                "file_content": b"downloaded content",
                "content_type": "text/plain"
            }

            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.content, b"downloaded content")
            mock_dl.assert_called_with("s3_key_for_dl.txt")

    def test_delete_file_view(self):
        # Test the standalone delete_file view
        r = Resource.objects.create(
            name="Del View",
            type="TXT",
            size=10,
            uploaded_by=self.user,
            workspace=self.ws1,
            file="s3_key_for_del.txt"
        )
        
        url = reverse("resources:delete", args=[r.profile_id])
        
        with patch("resources.views.delete_file_from_s3") as mock_del:
            mock_del.return_value = {"success": True, "file_key": "s3_key_for_del.txt"}

            resp = self.client.delete(url)
            self.assertEqual(resp.status_code, 200)
            self.assertFalse(Resource.objects.filter(pk=r.pk).exists())
            mock_del.assert_called_with("s3_key_for_del.txt")

    def test_list_files_view(self):
        url = reverse("resources:list")
        
        with patch("resources.views.list_files_in_s3") as mock_list:
            mock_list.return_value = {
                "success": True,
                "files": ["f1", "f2"],
                "count": 2
            }

            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["count"], 2)

    def test_download_not_found(self):
        url = reverse("resources:resource-download", args=[uuid.uuid4()])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_preview_not_found(self):
        url = reverse("resources:resource-preview", args=[uuid.uuid4()])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_download_local_file_missing(self):
        # Create resource but don't create the file on disk
        r = Resource.objects.create(
            name="Missing",
            type="TXT",
            size=10,
            uploaded_by=self.user,
            workspace=self.ws1,
            file="missing.txt"
        )
        url = reverse("resources:resource-download", args=[r.profile_id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_preview_local_file_missing(self):
        r = Resource.objects.create(
            name="Missing",
            type="TXT",
            size=10,
            uploaded_by=self.user,
            workspace=self.ws1,
            file="missing.txt"
        )
        url = reverse("resources:resource-preview", args=[r.profile_id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_file_no_file(self):
        url = reverse("resources:upload")
        resp = self.client.post(url, {}, format="multipart")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("No file provided", str(resp.content))

    def test_upload_file_db_failure(self):
        url = reverse("resources:upload")
        content = b"content"
        uploaded_file = SimpleUploadedFile(
            "test.txt", content, content_type="text/plain"
        )
        
        # Mock S3 success but DB failure
        with patch("resources.views.upload_file_to_s3") as mock_upload:
            mock_upload.return_value = {
                "success": True,
                "file_key": "key",
                "url": "url",
                "original_filename": "test.txt"
            }
            
            # Mock Resource.save to raise exception
            with patch("resources.models.Resource.save") as mock_save:
                mock_save.side_effect = Exception("DB Error")
                
                resp = self.client.post(
                    url, 
                    {"file": uploaded_file}, 
                    format="multipart"
                )
                self.assertEqual(resp.status_code, 500)
                self.assertIn("failed to create database record", str(resp.content))

    def test_download_file_s3_failure(self):
        url = reverse("resources:download", args=["some_key"])
        
        with patch("resources.views.download_file_from_s3") as mock_dl:
            mock_dl.return_value = {"success": False, "error": "Not found"}
            
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 404)

    def test_delete_file_s3_failure(self):
        url = reverse("resources:delete", args=["some_key"])
        
        with patch("resources.views.delete_file_from_s3") as mock_del:
            mock_del.return_value = {"success": False, "error": "Failed"}
            
            resp = self.client.delete(url)
            self.assertEqual(resp.status_code, 500)

    def test_list_files_failure(self):
        url = reverse("resources:list")
        
        with patch("resources.views.list_files_in_s3") as mock_list:
            mock_list.return_value = {"success": False, "error": "Failed"}
            
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 500)
            
    def test_delete_resource_s3_failure_logging(self):
        # Test that perform_destroy logs warning if S3 delete fails
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])
        
        with patch("resources.views.delete_file_from_s3") as mock_delete:
            mock_delete.return_value = {"success": False, "error": "S3 Error"}
            
            # We can't easily check logging output without more setup, 
            # but we can ensure the delete proceeds (204)
            resp = self.client.delete(detail_url)
            self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
            mock_delete.assert_called_once()

    def test_list_resources_all_user_workspaces(self):
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
        
        # GET without X-Workspace-ID
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {obj["profile_id"] for obj in resp.json()}
        self.assertIn(str(r1.profile_id), ids)
        self.assertIn(str(r2.profile_id), ids)

    def test_delete_resource_s3_exception_logging(self):
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])
        
        with patch("resources.views.delete_file_from_s3") as mock_delete:
            mock_delete.side_effect = Exception("S3 Exception")
            
            resp = self.client.delete(detail_url)
            self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
            mock_delete.assert_called_once()

    def test_upload_file_s3_failure(self):
        url = reverse("resources:upload")
        content = b"content"
        uploaded_file = SimpleUploadedFile(
            "test.txt", content, content_type="text/plain"
        )
        
        with patch("resources.views.upload_file_to_s3") as mock_upload:
            mock_upload.return_value = {"success": False, "error": "S3 Fail"}
            
            resp = self.client.post(
                url, 
                {"file": uploaded_file}, 
                format="multipart"
            )
            self.assertEqual(resp.status_code, 500)
            self.assertIn("S3 Fail", str(resp.content))

    def test_download_file_invalid_uuid_treats_as_key(self):
        # Pass a non-UUID string, should be treated as S3 key
        url = reverse("resources:download", args=["not-a-uuid"])
        
        with patch("resources.views.download_file_from_s3") as mock_dl:
            mock_dl.return_value = {
                "success": True, 
                "file_content": b"content", 
                "content_type": "text/plain"
            }
            
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200)
            mock_dl.assert_called_with("not-a-uuid")

    def test_delete_file_invalid_uuid_treats_as_key(self):
        url = reverse("resources:delete", args=["not-a-uuid"])
        
        with patch("resources.views.delete_file_from_s3") as mock_del:
            mock_del.return_value = {"success": True, "file_key": "not-a-uuid"}
            
            resp = self.client.delete(url)
            self.assertEqual(resp.status_code, 200)
            mock_del.assert_called_with("not-a-uuid")

    def test_download_file_valid_uuid_not_in_db(self):
        # Pass a valid UUID that is not in DB, should be treated as S3 key
        random_uuid = str(uuid.uuid4())
        url = reverse("resources:download", args=[random_uuid])
        
        with patch("resources.views.download_file_from_s3") as mock_dl:
            mock_dl.return_value = {
                "success": True, 
                "file_content": b"content", 
                "content_type": "text/plain"
            }
            
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200)
            mock_dl.assert_called_with(random_uuid)

    def test_delete_file_valid_uuid_not_in_db(self):
        random_uuid = str(uuid.uuid4())
        url = reverse("resources:delete", args=[random_uuid])
        
        with patch("resources.views.delete_file_from_s3") as mock_del:
            mock_del.return_value = {"success": True, "file_key": random_uuid}
            
            resp = self.client.delete(url)
            self.assertEqual(resp.status_code, 200)
            mock_del.assert_called_with(random_uuid)

    def test_serializer_uploaded_by_none(self):
        # Mock the resource object
        r = MagicMock()
        r.uploaded_by = None
        serializer = ResourceSerializer(r)
        self.assertIsNone(serializer.get_uploaded_by(r))

    def test_serializer_tags_single_string(self):
        # Test create with a JSON string that parses to a string (not list)
        # This triggers the path where validated_data['tags'] is a string
        content = b"content"
        uploaded_file = SimpleUploadedFile(
            "test.txt", content, content_type="text/plain"
        )
        
        # Send '"mytag"' which is valid JSON string
        data = {
            "name": "String Tag",
            "type": "TXT",
            "file": uploaded_file,
            "tags": '"mytag"',
        }
        
        resp = self.client.post(
            self.list_url,
            data=data,
            format="multipart",
            HTTP_X_WORKSPACE_ID=str(self.ws1.workspace_id),
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn("mytag", resp.json()["tags"])

    def test_update_tags_single_string(self):
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])
        
        resp = self.client.patch(
            detail_url,
            data={"tags": '"updatedtag"'},
            format="multipart"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("updatedtag", resp.json()["tags"])

    def test_update_resource_with_new_file(self):
        created = self._create_file_resource(self.ws1)
        detail_url = reverse("resources:resource-detail", args=[created["profile_id"]])
        
        # Update with new file (image)
        content = b"new image content"
        new_file = SimpleUploadedFile(
            "new.png", content, content_type="image/png"
        )
        
        # Mock S3 upload for the update
        self.mock_upload.return_value = {
            "success": True,
            "file_key": "new_key.png",
            "url": "url",
            "original_filename": "new.png"
        }
        
        resp = self.client.patch(
            detail_url,
            data={"file": new_file},
            format="multipart"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["type"], "PNG") # Auto-detected
        self.assertEqual(data["size"], len(content))

class S3UtilsTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Suppress logging during tests to keep output clean
        logging.disable(logging.CRITICAL)

    @classmethod
    def tearDownClass(cls):
        # Re-enable logging after tests
        logging.disable(logging.NOTSET)
        super().tearDownClass()

    @override_settings(AWS_ACCESS_KEY_ID=None)
    def test_get_s3_client_no_credentials(self):
        with self.assertRaises(ValueError):
            get_s3_client()

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_S3_REGION_NAME="us-east-1"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_get_s3_client_success(self, mock_boto):
        client = get_s3_client()
        self.assertIsNotNone(client)
        mock_boto.assert_called_once()

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_upload_no_bucket(self):
        res = upload_file_to_s3(io.BytesIO(b""), "test.txt")
        self.assertFalse(res["success"])
        self.assertIn("bucket name not configured", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket",
        AWS_S3_REGION_NAME="us-east-1"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_upload_success(self, mock_boto):
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        
        content = b"content"
        res = upload_file_to_s3(io.BytesIO(content), "test.txt", "text/plain")
        
        self.assertTrue(res["success"])
        self.assertIn("test.txt", res["file_key"])
        self.assertIn("url", res)
        mock_s3.upload_fileobj.assert_called_once()

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_upload_client_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.upload_fileobj.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Error"}}, "upload_fileobj"
        )
        mock_boto.return_value = mock_s3
        
        res = upload_file_to_s3(io.BytesIO(b""), "test.txt")
        self.assertFalse(res["success"])
        self.assertIn("AWS ClientError", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_upload_unexpected_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.upload_fileobj.side_effect = Exception("Unexpected")
        mock_boto.return_value = mock_s3
        
        res = upload_file_to_s3(io.BytesIO(b""), "test.txt")
        self.assertFalse(res["success"])
        self.assertIn("Unexpected error", res["error"])

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_download_no_bucket(self):
        res = download_file_from_s3("key")
        self.assertFalse(res["success"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_download_success(self, mock_boto):
        mock_s3 = MagicMock()
        mock_body = MagicMock()
        mock_body.read.return_value = b"content"
        mock_s3.get_object.return_value = {
            "Body": mock_body,
            "ContentType": "text/plain"
        }
        mock_boto.return_value = mock_s3
        
        res = download_file_from_s3("key")
        self.assertTrue(res["success"])
        self.assertEqual(res["file_content"], b"content")

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_download_not_found(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.get_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}}, "get_object"
        )
        mock_boto.return_value = mock_s3
        
        res = download_file_from_s3("key")
        self.assertFalse(res["success"])
        self.assertIn("File not found", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_download_client_error_generic(self, mock_boto):
        mock_s3 = MagicMock()
        # Error code other than NoSuchKey
        mock_s3.get_object.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Error"}}, "get_object"
        )
        mock_boto.return_value = mock_s3
        
        res = download_file_from_s3("key")
        self.assertFalse(res["success"])
        self.assertIn("AWS ClientError", res["error"])

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_delete_no_bucket(self):
        res = delete_file_from_s3("key")
        self.assertFalse(res["success"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_delete_success(self, mock_boto):
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        
        res = delete_file_from_s3("key")
        self.assertTrue(res["success"])
        mock_s3.delete_object.assert_called_once()

    @override_settings(AWS_STORAGE_BUCKET_NAME=None)
    def test_list_no_bucket(self):
        res = list_files_in_s3()
        self.assertFalse(res["success"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_list_success(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.list_objects_v2.return_value = {
            "Contents": [
                {
                    "Key": "file1.txt",
                    "Size": 100,
                    "LastModified": MagicMock(isoformat=lambda: "2023-01-01")
                }
            ]
        }
        mock_boto.return_value = mock_s3
        
        res = list_files_in_s3()
        self.assertTrue(res["success"])
        self.assertEqual(res["count"], 1)
        self.assertEqual(res["files"][0]["key"], "file1.txt")

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_delete_client_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.delete_object.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Error"}}, "delete_object"
        )
        mock_boto.return_value = mock_s3
        
        res = delete_file_from_s3("key")
        self.assertFalse(res["success"])
        self.assertIn("AWS ClientError", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_delete_unexpected_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.delete_object.side_effect = Exception("Unexpected")
        mock_boto.return_value = mock_s3
        
        res = delete_file_from_s3("key")
        self.assertFalse(res["success"])
        self.assertIn("Unexpected error", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_list_client_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.list_objects_v2.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Error"}}, "list_objects_v2"
        )
        mock_boto.return_value = mock_s3
        
        res = list_files_in_s3()
        self.assertFalse(res["success"])
        self.assertIn("AWS ClientError", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_list_unexpected_error(self, mock_boto):
        mock_s3 = MagicMock()
        mock_s3.list_objects_v2.side_effect = Exception("Unexpected")
        mock_boto.return_value = mock_s3
        
        res = list_files_in_s3()
        self.assertFalse(res["success"])
        self.assertIn("Unexpected error", res["error"])

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_get_s3_client_no_credentials_error(self, mock_boto):
        mock_boto.side_effect = NoCredentialsError()
        with self.assertRaises(NoCredentialsError):
            get_s3_client()

    @override_settings(
        AWS_ACCESS_KEY_ID="test",
        AWS_SECRET_ACCESS_KEY="test",
        AWS_STORAGE_BUCKET_NAME="test-bucket"
    )
    @patch("resources.s3_utils.boto3.client")
    def test_get_s3_client_unexpected_error(self, mock_boto):
        mock_boto.side_effect = Exception("Unexpected")
        with self.assertRaises(Exception):
            get_s3_client()
