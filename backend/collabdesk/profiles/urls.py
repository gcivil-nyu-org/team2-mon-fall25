from django.urls import path
from .views import ProfileDetailView, ProfileListCreateView

urlpatterns = [
    path('', ProfileListCreateView.as_view(), name='profile-list'),
    path('<int:pk>/', ProfileDetailView.as_view(), name='profile-detail'),
]
