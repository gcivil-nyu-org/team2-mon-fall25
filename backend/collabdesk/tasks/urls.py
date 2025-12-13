from django.urls import path
from rest_framework import routers

from .views import TaskViewSet, TaskSummaryView

router = routers.DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("summary/", TaskSummaryView.as_view(), name="task-summary"),
]

urlpatterns += router.urls
