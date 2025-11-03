Authorization & Workspace Management Implementation Plan
Current State Analysis
Based on your Django models, you have a solid foundation with:
✅ Workspace model with UUID primary keys
✅ WorkspaceMember for user-workspace relationships
✅ Role-based permission system (Role, Permission, RolePermission)
❌ Auth0 authentication isolated from database
❌ APIs don't filter data by workspace
❌ No user synchronization between Auth0 and database
❌ No workspace member invitation system
<hr></hr>
#Implementation Plan
Phase 1: User Synchronization with Auth0
Problem: Auth0 handles authentication but your database has no user records.
Solution: Create a custom user model and sync Auth0 users on first login.
Step 1.1: Create User Model Extension
Create backend/collabdesk/users/models.py:
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    auth0_sub = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    profile_picture = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'auth0_sub'
    REQUIRED_FIELDS = ['email']
Update settings.py:
AUTH_USER_MODEL = 'users.User'
Step 1.2: Create Auth0 Middleware
Create backend/collabdesk/core/middleware/auth0_middleware.py:
from django.contrib.auth import get_user_model
from jose import jwt
import requests

User = get_user_model()

class Auth0SyncMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Decode and verify Auth0 token
                payload = jwt.decode(
                    token,
                    # Your Auth0 public key/verification config
                    options={"verify_signature": False}  # Configure properly
                )
                
                auth0_sub = payload.get('sub')
                email = payload.get('email')
                
                # Get or create user
                user, created = User.objects.get_or_create(
                    auth0_sub=auth0_sub,
                    defaults={
                        'email': email,
                        'username': email,
                        'full_name': payload.get('name', ''),
                        'profile_picture': payload.get('picture', '')
                    }
                )
                
                request.user = user
                
            except Exception as e:
                pass  # Handle error appropriately
        
        return self.get_response(request)
<hr></hr>
Phase 2: Workspace-Scoped Data Access
Problem: APIs don't filter data by workspace context.
Solution: Implement workspace context middleware and query filtering.
Step 2.1: Workspace Context Middleware
Create backend/collabdesk/core/middleware/workspace_middleware.py:
class WorkspaceContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract workspace_id from header or URL
        workspace_id = request.headers.get('X-Workspace-ID') or \
                      request.GET.get('workspace_id')
        
        if workspace_id and request.user.is_authenticated:
            # Verify user has access to this workspace
            try:
                membership = WorkspaceMember.objects.get(
                    workspace_id=workspace_id,
                    user=request.user
                )
                request.workspace = membership.workspace
                request.workspace_role = membership.role
            except WorkspaceMember.DoesNotExist:
                request.workspace = None
        
        return self.get_response(request)
Step 2.2: Update Models to Include Workspace
Example for Events model:
class Event(models.Model):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='events')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    class Meta:
        indexes = [
            models.Index(fields=['workspace', 'start_time']),
        ]
Apply similar pattern to Tasks, Notes, etc.
Step 2.3: Create Base Workspace Viewset
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

class WorkspaceViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        if not hasattr(self.request, 'workspace') or not self.request.workspace:
            raise PermissionDenied("Workspace context required")
        
        # Filter all queries by workspace
        return super().get_queryset().filter(workspace=self.request.workspace)
    
    def perform_create(self, serializer):
        if not hasattr(self.request, 'workspace'):
            raise PermissionDenied("Workspace context required")
        
        serializer.save(
            workspace=self.request.workspace,
            created_by=self.request.user
        )
<hr></hr>
Phase 3: Permission & Authorization System
Step 3.1: Define Standard Permissions
Create migration to populate permissions:
PERMISSIONS = [
    ('view_workspace', 'Can view workspace'),
    ('edit_workspace', 'Can edit workspace settings'),
    ('delete_workspace', 'Can delete workspace'),
    ('manage_members', 'Can add/remove members'),
    ('create_event', 'Can create events'),
    ('edit_event', 'Can edit events'),
    ('delete_event', 'Can delete events'),
    ('create_task', 'Can create tasks'),
    # ... add more
]

ROLES = {
    'Owner': ['all permissions'],
    'Admin': ['all except delete_workspace'],
    'Member': ['view_workspace', 'create_event', 'create_task', 'edit_own'],
    'Viewer': ['view_workspace'],
}
Step 3.2: Permission Decorator
from functools import wraps
from rest_framework.exceptions import PermissionDenied

def require_workspace_permission(permission_name):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'workspace_role'):
                raise PermissionDenied("No workspace role")
            
            has_permission = RolePermission.objects.filter(
                role=request.workspace_role,
                permission__name=permission_name
            ).exists()
            
            if not has_permission:
                raise PermissionDenied(f"Missing permission: {permission_name}")
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
<hr></hr>
Phase 4: Workspace Member Invitation System
Solution: Email-based invitation with token authentication.
Step 4.1: Create Invitation Model
class WorkspaceInvitation(models.Model):
    invitation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    email = models.EmailField()
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Set to 7 days from creation
    
    class Meta:
        unique_together = ('workspace', 'email')
Step 4.2: Invitation API Endpoints
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from datetime import timedelta
from django.utils import timezone

class WorkspaceViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'], url_path='invite')
    @require_workspace_permission('manage_members')
    def invite_member(self, request, pk=None):
        workspace = self.get_object()
        email = request.data.get('email')
        role_id = request.data.get('role_id')
        
        invitation = WorkspaceInvitation.objects.create(
            workspace=workspace,
            email=email,
            role_id=role_id,
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Send email with invitation link
        invitation_url = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
        send_mail(
            subject=f'Invitation to join {workspace.name}',
            message=f'Click here to join: {invitation_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email]
        )
        
        return Response({'message': 'Invitation sent'})
    
    @action(detail=False, methods=['post'], url_path='accept-invite')
    def accept_invitation(self, request):
        token = request.data.get('token')
        
        try:
            invitation = WorkspaceInvitation.objects.get(
                token=token,
                status='pending',
                expires_at__gt=timezone.now()
            )
            
            # Create workspace member
            WorkspaceMember.objects.create(
                workspace=invitation.workspace,
                user=request.user,
                role=invitation.role
            )
            
            invitation.status = 'accepted'
            invitation.save()
            
            return Response({'workspace_id': str(invitation.workspace.workspace_id)})
            
        except WorkspaceInvitation.DoesNotExist:
            return Response({'error': 'Invalid or expired invitation'}, status=400)
<hr></hr>
Frontend Integration
Update API Client
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add workspace context to all requests
apiClient.interceptors.request.use((config) => {
  const workspaceId = localStorage.getItem('currentWorkspaceId');
  const token = localStorage.getItem('auth0Token');
  
  if (workspaceId) {
    config.headers['X-Workspace-ID'] = workspaceId;
  }
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});
Workspace Selector Component
// src/components/WorkspaceSelector.tsx
const WorkspaceSelector = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  
  const switchWorkspace = (workspaceId: string) => {
    localStorage.setItem('currentWorkspaceId', workspaceId);
    setCurrentWorkspace(workspaceId);
    // Refresh data
  };
  
  // UI to display and switch workspaces
};
<hr></hr>
Execution Steps
Week 1: Implement User synchronization (Phase 1)
Week 2: Add workspace context middleware and update models (Phase 2)
Week 3: Implement permission system (Phase 3)
Week 4: Build invitation system (Phase 4)
Week 5: Update all existing APIs to be workspace-aware
Week 6: Frontend integration and testing
Migration Strategy
Create custom user model migration
Create invitation model migration
Update existing models to add workspace foreign keys
Create data migration to assign existing data to default workspace
Test thoroughly before deploying
This plan provides a solid foundation for multi-workspace, role-based authorization that integrates Auth0 with your Django backend.