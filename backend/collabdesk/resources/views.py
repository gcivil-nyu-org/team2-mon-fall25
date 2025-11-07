import boto3
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .serializers import ResourceSerializer
from .models import Resource
from collabdesk.middleware import set_workspace_context

# Create your views here.

class ResourcePresignedUrlView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        key = resource.file.name
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
            ExpiresIn=3600,
        )
        return Response({"url": url})

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
