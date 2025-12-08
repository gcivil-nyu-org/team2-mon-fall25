import os
import boto3
import logging
import uuid
from rest_framework import generics, status
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.http import FileResponse, Http404, JsonResponse, HttpResponse
from .serializers import ResourceSerializer
from .models import Resource
from collabdesk.middleware import set_workspace_context
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .s3_utils import (
    upload_file_to_s3,
    download_file_from_s3,
    delete_file_from_s3,
    list_files_in_s3,
)

# Create your views here.


class ResourceDownloadView(APIView):
    """Generate presigned URL for downloading (forces attachment)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        key = resource.file.name

        # If an S3 bucket is configured, generate a presigned S3 URL.
        if getattr(settings, "AWS_STORAGE_BUCKET_NAME", None):
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
            )
            # Extract original filename from the S3 key (remove UUID prefix)
            filename = key.split("_", 1)[1] if "_" in key else key
            url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                    "Key": key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=3600,
            )
            return Response({"url": url})

        # Otherwise assume local FileSystemStorage (local testing) and stream the file
        # back to the client using FileResponse.
        try:
            file_obj = default_storage.open(key, "rb")
        except Exception:
            # Could not open the file from storage
            raise Http404("File not found")

        filename = os.path.basename(key)
        response = FileResponse(file_obj, as_attachment=True, filename=filename)
        return response


class ResourcePreviewView(APIView):
    """Generate presigned URL for previewing (inline display in browser)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        key = resource.file.name

        # If an S3 bucket is configured, generate a presigned S3 URL.
        if getattr(settings, "AWS_STORAGE_BUCKET_NAME", None):
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
            )
            # Extract original filename from the S3 key (remove UUID prefix)
            filename = key.split("_", 1)[1] if "_" in key else key
            url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                    "Key": key,
                    "ResponseContentDisposition": f'inline; filename="{filename}"',
                },
                ExpiresIn=3600,
            )
            return Response({"url": url})

        # Otherwise assume local FileSystemStorage (local testing) and stream the file
        # back to the client using FileResponse.
        try:
            file_obj = default_storage.open(key, "rb")
        except Exception:
            # Could not open the file from storage
            raise Http404("File not found")

        filename = os.path.basename(key)
        response = FileResponse(file_obj, as_attachment=False, filename=filename)
        return response


class ResourceCreateView(generics.ListCreateAPIView):
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        user = self.request.user

        if hasattr(self.request, "workspace") and self.request.workspace:
            return Resource.objects.filter(workspace=self.request.workspace)

        user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
        return Resource.objects.filter(workspace_id__in=user_workspaces)

    def perform_create(self, serializer):
        if not hasattr(self.request, "workspace") or not self.request.workspace:
            raise PermissionDenied(
                "Workspace context required. Please provide X-Workspace-ID header."
            )

        serializer.save(workspace=self.request.workspace, uploaded_by=self.request.user)


class ResourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        # Delete file from S3 before deleting database record
        if instance.file:
            s3_key = (
                instance.file.name
                if hasattr(instance.file, "name")
                else str(instance.file)
            )
            try:
                result = delete_file_from_s3(s3_key)
                if not result["success"]:
                    logging.getLogger(__name__).warning(
                        f"Failed to delete S3 file {s3_key}: {result.get('error')}"
                    )
            except Exception as e:
                logging.getLogger(__name__).warning(
                    f"Error deleting S3 file {s3_key}: {str(e)}"
                )

        instance.delete()


# Temporarily used to implement file upload and download
@csrf_exempt
@require_http_methods(["POST"])
def upload_file(request):
    if "file" not in request.FILES:
        return JsonResponse(
            {
                "success": False,
                "error": "No file provided. Please include a file in the request.",
            },
            status=400,
        )

    uploaded_file = request.FILES["file"]
    content_type = uploaded_file.content_type

    # Upload to S3
    result = upload_file_to_s3(uploaded_file.file, uploaded_file.name, content_type)

    if result["success"]:
        # Create a Resource record in the database
        try:
            from django.core.files.base import ContentFile
            import os

            # Infer file type from extension
            ext = os.path.splitext(uploaded_file.name)[1].lower().lstrip(".")
            # Map file extension to FileType
            ext_map = {
                # Images
                "jpg": "JPG",
                "jpeg": "JPEG",
                "png": "PNG",
                "gif": "GIF",
                "svg": "SVG",
                "bmp": "BMP",
                "webp": "WEBP",
                "ico": "ICO",
                # Documents
                "pdf": "PDF",
                "docx": "DOCX",
                "doc": "DOC",
                "pptx": "PPTX",
                "ppt": "PPT",
                "xlsx": "XLSX",
                "xls": "XLS",
                # Videos
                "mp4": "MP4",
                "avi": "AVI",
                "mov": "MOV",
                "wmv": "WMV",
                "webm": "WEBM",
                # Audio
                "mp3": "MP3",
                "wav": "WAV",
                "ogg": "OGG",
                # Text/Code
                "txt": "TXT",
                "csv": "CSV",
                "json": "JSON",
                "xml": "XML",
                "md": "MD",
                "html": "HTML",
                "css": "CSS",
                "js": "JS",
                "py": "PY",
                # Archives
                "zip": "ZIP",
                "rar": "RAR",
                "tar": "TAR",
                "gz": "GZ",
            }
            file_type = ext_map.get(ext, "OTHER")

            # Get workspace_id and user from request (if available)
            workspace_id = request.POST.get("workspace_id") or request.GET.get(
                "workspace_id"
            )
            user_id = (
                request.POST.get("user_id") or request.user.id
                if hasattr(request, "user") and request.user.is_authenticated
                else 1
            )

            # Create Resource object
            resource = Resource(
                name=uploaded_file.name,
                type=file_type,
                size=uploaded_file.size,
                uploaded_by_id=user_id,
                file=result["file_key"],  # Store S3 key in file field
            )

            # Set workspace if provided
            if workspace_id:
                resource.workspace_id = workspace_id

            resource.save()

            return JsonResponse(
                {
                    "success": True,
                    "message": "File uploaded successfully",
                    "resource_id": str(resource.profile_id),
                    "file_key": result["file_key"],
                    "url": result["url"],
                    "original_filename": result["original_filename"],
                },
                status=201,
            )
        except Exception as e:
            # If database creation fails, we should ideally delete the S3 file
            # but for now just log the error
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create Resource record: {str(e)}")
            return JsonResponse(
                {
                    "success": False,
                    "error": f"File uploaded to S3 but failed to create database record: {str(e)}",
                    "file_key": result["file_key"],
                },
                status=500,
            )
    else:
        return JsonResponse(
            {"success": False, "error": result.get("error", "Unknown error occurred")},
            status=500,
        )


@require_http_methods(["GET"])
def download_file(request, file_key):
    # file_key is either a UUID (profile_id) or an S3 key string
    # Try to find Resource by UUID first
    try:
        try:
            # Try to parse as UUID
            resource_uuid = uuid.UUID(file_key)
            resource = Resource.objects.get(profile_id=resource_uuid)
            # Use the file field value as the S3 key
            s3_key = resource.file.name
        except (ValueError, Resource.DoesNotExist):
            # If not a valid UUID or not found, treat as S3 key directly
            s3_key = file_key
    except Exception:
        s3_key = file_key

    result = download_file_from_s3(s3_key)

    if result["success"]:
        response = HttpResponse(
            result["file_content"], content_type=result["content_type"]
        )
        # Extract original filename from file_key (remove UUID prefix)
        filename = s3_key.split("_", 1)[1] if "_" in s3_key else s3_key
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
    else:
        return JsonResponse(
            {"success": False, "error": result.get("error", "File not found")},
            status=404,
        )


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_file(request, file_key):
    # file_key is either a UUID (profile_id) or an S3 key string
    # Try to find and delete Resource by UUID first
    try:
        try:
            # Try to parse as UUID
            resource_uuid = uuid.UUID(file_key)
            resource = Resource.objects.get(profile_id=resource_uuid)
            # Use the file field value as the S3 key
            s3_key = resource.file.name
            # Delete from S3
            result = delete_file_from_s3(s3_key)
            if result["success"]:
                # Also delete the database record
                resource.delete()
        except (ValueError, Resource.DoesNotExist):
            # If not a valid UUID or not found, treat as S3 key directly
            s3_key = file_key
            result = delete_file_from_s3(s3_key)
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Error deleting file: {str(e)}"},
            status=500,
        )

    if result["success"]:
        return JsonResponse(
            {
                "success": True,
                "message": "File deleted successfully",
                "file_key": result["file_key"],
            },
            status=200,
        )
    else:
        return JsonResponse(
            {"success": False, "error": result.get("error", "Unknown error occurred")},
            status=500,
        )


@require_http_methods(["GET"])
def list_files(request):
    prefix = request.GET.get("prefix", "")
    max_keys = int(request.GET.get("max_keys", 100))

    result = list_files_in_s3(prefix, max_keys)

    if result["success"]:
        return JsonResponse(
            {"success": True, "files": result["files"], "count": result["count"]},
            status=200,
        )
    else:
        return JsonResponse(
            {"success": False, "error": result.get("error", "Unknown error occurred")},
            status=500,
        )


class LatestResourcesView(generics.ListAPIView):
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        set_workspace_context(request)

    def get_queryset(self):
        request = self.request
        user = request.user

        # If workspace context available
        if hasattr(request, "workspace") and request.workspace:
            qs = Resource.objects.filter(workspace=request.workspace)
        else:
            # fallback: all user's workspaces
            user_workspaces = user.workspaces.values_list("workspace_id", flat=True)
            qs = Resource.objects.filter(workspace_id__in=user_workspaces)

        # Latest 3 updated resources
        return qs.order_by("-uploaded")[:3]
