import uuid

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import logging

logger = logging.getLogger(__name__)


# Create your models here.
class Tag(models.Model):
    name = models.CharField(max_length=50)

    class Meta:
        indexes = [models.Index(fields=["name"])]

    def __str__(self):
        return self.name


class Resource(models.Model):
    class FileType(models.TextChoices):
        PDF = "PDF", _("PDF file")
        DOCX = "DOCX", _("DOCX file")
        PPTX = "PPTX", _("PPTX file")
        XLSX = "XLSX", _("XLSX file")
        JPG = "JPG", _("JPG file")
        PNG = "PNG", _("PNG file")
        ZIP = "ZIP", _("ZIP file")
        TXT = "TXT", _("TXT file")

    #    def resource_upload_to(instance, filename):
    #        ws_id = getattr(instance, "workspace_id", None)
    #        if not ws_id:
    #            ws = getattr(instance, "workspace", None)
    #            ws_id = getattr(ws, "workspace_id", "unknown")
    #        ident = getattr(instance, "profile_id", None) or uuid.uuid4()
    #        return f"resources/{ws_id}/resources/{ident}/{filename}"

    profile_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default="none")
    type = models.CharField(
        max_length=15,
        choices=FileType.choices,
    )
    size = models.BigIntegerField()
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1
    )
    uploaded = models.DateTimeField(default=timezone.now)
    #    file = models.FileField(max_length=200, upload_to=resource_upload_to)
    file = models.FileField(max_length=200)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="resources",
        # default=uuid.UUID("cdb5abfe-dc99-4394-ac0e-e50a2f21d960"),
    )
    tags = models.ManyToManyField(Tag, related_name="resources", blank=True)

    def save(self, *args, **kwargs):
        if self.file and hasattr(self.file, "size"):
            self.size = self.file.size
        else:
            logger.info("Don't find the file size")
        super().save(*args, **kwargs)
