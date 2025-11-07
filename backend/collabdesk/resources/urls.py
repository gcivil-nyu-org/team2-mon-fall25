from django.urls import path
from .views import *

app_name = "resources"
urlpatterns = [
    path("", ResourceCreateView.as_view(), name="resource-list"),
]
