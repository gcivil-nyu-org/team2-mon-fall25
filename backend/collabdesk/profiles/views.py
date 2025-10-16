from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from .serializers import ProfileSerializer
from .models import Profile
# Create your views here.

class ProfileListCreateView(generics.ListCreateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('id')
        if event_id:
            try:
                event = Profile.objects.get(id=event_id)
            except Profile.DoesNotExist:
                return Response({'Error': 'Event not found'}, status = 404)

            serializer = self.get_serializer(event)
            return Response(serializer.data)
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Profile.objects.all()
    serializer_calss = ProfileSerializer
