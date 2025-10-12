from django.urls import path
from .views import WorkspaceInformationView

urlpatterns = [
    path('information/', WorkspaceInformationView.as_view(), name='workspace-information'),
]
