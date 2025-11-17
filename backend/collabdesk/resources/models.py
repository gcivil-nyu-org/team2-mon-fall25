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
        # Documents
        PDF = "PDF", _("PDF file")
        DOCX = "DOCX", _("DOCX file")
        DOC = "DOC", _("DOC file")
        PPTX = "PPTX", _("PPTX file")
        PPT = "PPT", _("PPT file")
        XLSX = "XLSX", _("XLSX file")
        XLS = "XLS", _("XLS file")
        # Images
        JPG = "JPG", _("JPG file")
        JPEG = "JPEG", _("JPEG file")
        PNG = "PNG", _("PNG file")
        GIF = "GIF", _("GIF file")
        SVG = "SVG", _("SVG file")
        BMP = "BMP", _("BMP file")
        WEBP = "WEBP", _("WEBP file")
        ICO = "ICO", _("ICO file")
        # Videos
        MP4 = "MP4", _("MP4 file")
        AVI = "AVI", _("AVI file")
        MOV = "MOV", _("MOV file")
        WMV = "WMV", _("WMV file")
        WEBM = "WEBM", _("WEBM file")
        # Audio
        MP3 = "MP3", _("MP3 file")
        WAV = "WAV", _("WAV file")
        OGG = "OGG", _("OGG file")
        # Text/Code
        TXT = "TXT", _("TXT file")
        CSV = "CSV", _("CSV file")
        JSON = "JSON", _("JSON file")
        XML = "XML", _("XML file")
        MD = "MD", _("Markdown file")
        HTML = "HTML", _("HTML file")
        CSS = "CSS", _("CSS file")
        JS = "JS", _("JavaScript file")
        PY = "PY", _("Python file")
        # Archives
        ZIP = "ZIP", _("ZIP file")
        RAR = "RAR", _("RAR file")
        TAR = "TAR", _("TAR file")
        GZ = "GZ", _("GZ file")
        # Other
        OTHER = "OTHER", _("Other file")

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
        # Avoid touching storage for size; only use in-memory uploaded file object if present
        if (self.size is None or self.size == 0) and getattr(self, "file", None):
            file_obj = getattr(self.file, "file", None)
            if file_obj is not None and hasattr(file_obj, "size"):
                self.size = file_obj.size
            else:
                logger.info(
                    "File size not available on in-memory object; preserving existing size"
                )
        super().save(*args, **kwargs)
