from .models import Event
from rest_framework import generics
from rest_framework.response import Response
from .serializers import EventSerializer
# Create your views here.

class EventListCreateView(generics.ListCreateAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('id')
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return Response({'Error': 'Event not found'}, status = 404)

            serializer = self.get_serializer(event)
            return Response(serializer.data)
        return super().get(request, *args, **kwargs)

class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_calss = EventSerializer
