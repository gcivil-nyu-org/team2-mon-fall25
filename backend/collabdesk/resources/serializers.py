from rest_framework import serializers
from .models import Resource, Tag
from django.conf import settings
import pytz
import os
import logging

logger = logging.getLogger(__name__)


class ResourceSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    size = serializers.IntegerField(read_only=True)
    # Represent tags as a JSON list (accepts JSON string in multipart)
    tags = serializers.JSONField(required=False)

    class Meta:
        model = Resource
        fields = "__all__"
        read_only_fields = ["workspace", "size", "uploaded_by"]

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
        from .s3_utils import upload_file_to_s3

        tag_names = validated_data.pop("tags", [])
        # Normalize tags into a list of strings
        if isinstance(tag_names, str):
            try:
                import json

                tag_names = json.loads(tag_names)
            except Exception:
                tag_names = [tag_names]
        if tag_names is None:
            tag_names = []

        # Handle file upload to S3 if file is provided
        file_field = validated_data.get("file")
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
                inferred = (
                    "JPG"
                    if ext in ("jpg", "jpeg")
                    else (
                        "PNG"
                        if ext == "png"
                        else (
                            "PDF"
                            if ext == "pdf"
                            else (
                                "DOCX"
                                if ext in ("docx", "doc")
                                else (
                                    "PPTX"
                                    if ext in ("pptx", "ppt")
                                    else (
                                        "XLSX"
                                        if ext in ("xlsx", "xls", "csv")
                                        else "ZIP" if ext in ("zip", "rar") else "TXT"
                                    )
                                )
                            )
                        )
                    )
                )
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
                inferred = (
                    "JPG"
                    if ext in ("jpg", "jpeg")
                    else (
                        "PNG"
                        if ext == "png"
                        else (
                            "PDF"
                            if ext == "pdf"
                            else (
                                "DOCX"
                                if ext in ("docx", "doc")
                                else (
                                    "PPTX"
                                    if ext in ("pptx", "ppt")
                                    else (
                                        "XLSX"
                                        if ext in ("xlsx", "xls", "csv")
                                        else "ZIP" if ext in ("zip", "rar") else "TXT"
                                    )
                                )
                            )
                        )
                    )
                )
                validated_data["type"] = inferred
        resource = super().update(instance, validated_data)
        if tag_names is not None:
            tags = [
                Tag.objects.get_or_create(name=name.strip())[0]
                for name in tag_names
                if name and name.strip()
            ]
            resource.tags.set(tags)
        return resource
