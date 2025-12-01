from rest_framework import serializers
from .models import Resource, Tag
from django.conf import settings
import pytz
import os
import logging
from .s3_utils import upload_file_to_s3
import json

logger = logging.getLogger(__name__)


class ResourceSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    uploaded_by = serializers.SerializerMethodField(read_only=True)
    uploaded_by_id = serializers.SerializerMethodField(read_only=True)
    size = serializers.IntegerField(read_only=True)
    # Represent tags as a JSON list (accepts JSON string in multipart)
    tags = serializers.JSONField(required=False)

    class Meta:
        model = Resource
        fields = "__all__"
        read_only_fields = ["workspace", "size", "uploaded_by", "uploaded_by_id"]

    def get_uploaded_by_id(self, obj):
        return obj.uploaded_by.id if obj.uploaded_by else None

    def get_uploaded_by(self, obj):
        """Return the full_name of the user who uploaded the resource."""
        if obj.uploaded_by:
            return obj.uploaded_by.full_name or obj.uploaded_by.username
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UTC datetimes to the configured timezone
        tz = pytz.timezone(settings.TIME_ZONE)

        if instance.uploaded:
            # Convert to the target timezone and format with offset
            uploaded_local = instance.uploaded.astimezone(tz)
            data["uploaded"] = uploaded_local.isoformat()

        # Replace tag IDs with tag names if DRF tried to serialize M2M default
        if (
            isinstance(data.get("tags"), list)
            and data["tags"]
            and isinstance(data["tags"][0], int)
        ):
            data["tags"] = list(instance.tags.values_list("name", flat=True))
        else:
            # Ensure tags are names list
            data["tags"] = list(instance.tags.values_list("name", flat=True))

        return data

    def create(self, validated_data):

        tag_names = validated_data.pop("tags", [])
        # Normalize tags into a list of strings
        if isinstance(tag_names, str):
            try:

                tag_names = json.loads(tag_names)
            except Exception:
                tag_names = [tag_names]
        if tag_names is None:
            tag_names = []

        # Handle file upload to S3 if file is provided
        file_field = validated_data.get("file")
        # Capture original size from the uploaded file object (storage-agnostic)
        validated_data["size"] = file_field.size
        if file_field and hasattr(file_field, "file"):
            # Upload to S3
            content_type = getattr(file_field, "content_type", None)
            result = upload_file_to_s3(file_field.file, file_field.name, content_type)

            if not result["success"]:
                logger.error(f"Failed to upload file to S3: {result.get('error')}")
                raise serializers.ValidationError(
                    f"Failed to upload file: {result.get('error')}"
                )

            # Replace file field with S3 key
            validated_data["file"] = result["file_key"]
            logger.info(f"File uploaded to S3: {result['file_key']}")

        # Auto-detect file type from filename if not provided
        if not validated_data.get("type"):
            file = validated_data.get("file")
            filename = (
                file
                if isinstance(file, str)
                else (file.name if file and hasattr(file, "name") else "")
            )
            if filename:
                ext = os.path.splitext(filename)[1].lower().lstrip(".")
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
                inferred = ext_map.get(ext, "OTHER")
                validated_data["type"] = inferred

        resource = super().create(validated_data)
        if tag_names:
            tags = [
                Tag.objects.get_or_create(name=name.strip())[0]
                for name in tag_names
                if name and name.strip()
            ]
            resource.tags.set(tags)
        return resource

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)
        if isinstance(tag_names, str):
            try:
                import json

                tag_names = json.loads(tag_names)
            except Exception:
                tag_names = [tag_names]
        # If type not provided but a new file is uploaded, infer type
        if not validated_data.get("type") and validated_data.get("file"):
            file = validated_data.get("file")
            if file and hasattr(file, "name"):
                ext = os.path.splitext(file.name)[1].lower().lstrip(".")
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
                inferred = ext_map.get(ext, "OTHER")
                validated_data["type"] = inferred
            # Also update size when a new file is uploaded
            if file and hasattr(file, "size"):
                validated_data["size"] = file.size
        resource = super().update(instance, validated_data)
        if tag_names is not None:
            tags = [
                Tag.objects.get_or_create(name=name.strip())[0]
                for name in tag_names
                if name and name.strip()
            ]
            resource.tags.set(tags)
        return resource
