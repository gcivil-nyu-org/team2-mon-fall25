# Complete Authorization System Implementation Plan
**Version:** 1.0
**Status:** Ready for Implementation
**Estimated Time:** 38 hours (6-7 working days at 6hrs/day)
**Last Updated:** 2025-10-31

---

## 📋 Executive Summary

This plan implements a **workspace-based authorization system** with:
- ✅ Simple role hierarchy (Owner & Member)
- ✅ Private events with participant sharing
- ✅ Direct member management (no invitations)
- ✅ Workspace-scoped profile visibility
- ✅ Complete data isolation between workspaces
- ✅ Comprehensive audit logging

**Current State:** No authorization (all data exposed to all users)
**Target State:** Workspace-based access control with proper permissions

---

## 🎯 Design Decisions (Based on Requirements)

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| **Role Hierarchy** | Owner & Member only | Simplicity - easy to understand and implement |
| **Event Privacy** | Private with sharing | Explicit control over who sees events |
| **Member Addition** | Direct add by owner | Fast for testing, no email setup needed |
| **Profile Visibility** | Shared workspace only | Encourages collaboration while maintaining privacy |

---

## 📊 Database Schema Design

### Modified Tables

#### `workspaces_workspace`
```sql
workspace_id        UUID PRIMARY KEY
name                VARCHAR(255)
description         TEXT NULLABLE
created_by_id       INT FK(users_user.id)
created_at          TIMESTAMP
updated_at          TIMESTAMP          -- NEW
is_active           BOOLEAN DEFAULT TRUE -- NEW (soft delete)

INDEX(created_by_id)
INDEX(is_active)
```

#### `workspaces_workspacemember`
```sql
id                  UUID PRIMARY KEY
workspace_id        UUID FK(workspaces_workspace.workspace_id) ON DELETE CASCADE
user_id             INT FK(users_user.id) ON DELETE CASCADE
role                VARCHAR(20)        -- CHANGED from FK to choices ['owner','member']
joined_at           TIMESTAMP
invited_by_id       INT FK(users_user.id) NULLABLE -- NEW
is_active           BOOLEAN DEFAULT TRUE -- NEW

UNIQUE(workspace_id, user_id)
INDEX(user_id)
INDEX(workspace_id, is_active)
```

**Change Rationale:** Simplify from FK-based roles to string choices for Owner/Member system

#### `profiles_profile`
```sql
profile_id          UUID PRIMARY KEY
user_id             INT UNIQUE FK(users_user.id) -- CHANGED to OneToOneField
full_name           VARCHAR(50)
avatar_url          VARCHAR(100)
bio                 VARCHAR(200)
created_at          TIMESTAMP

UNIQUE(user_id)  -- Enforce one profile per user
```

**Change Rationale:** Prevent duplicate profiles (found 8 users with no profile in current DB)

#### `events_event`
```sql
event_id            UUID PRIMARY KEY
title               VARCHAR(100)
description         TEXT
start_time          TIMESTAMP
end_time            TIMESTAMP
event_type          VARCHAR(20) CHOICES['INDIVIDUAL','GROUP']
location            VARCHAR(100)
created_by_id       INT FK(users_user.id) -- REMOVE default=1
workspace_id        UUID FK(workspaces_workspace.workspace_id) -- REMOVE default UUID
is_private          BOOLEAN DEFAULT TRUE -- NEW
created_at          TIMESTAMP
updated_at          TIMESTAMP

INDEX(workspace_id, start_time)
INDEX(created_by_id)
INDEX(workspace_id, is_private)
```

**Change Rationale:** Remove hardcoded defaults, add privacy control

### New Tables

#### `events_eventparticipant`
```sql
id                  UUID PRIMARY KEY
event_id            UUID FK(events_event.event_id) ON DELETE CASCADE
user_id             INT FK(users_user.id) ON DELETE CASCADE
added_by_id         INT FK(users_user.id)
added_at            TIMESTAMP
status              VARCHAR(20) CHOICES['accepted','declined','pending'] DEFAULT 'accepted'

UNIQUE(event_id, user_id)
INDEX(user_id)
INDEX(event_id, status)
```

**Purpose:** Enable sharing private events with specific workspace members

**Status Field:** Defaults to 'accepted' when shared (simple flow). Can be changed to 'declined' but event remains visible to participant.

#### `workspaces_auditlog`
```sql
id                  UUID PRIMARY KEY
workspace_id        UUID FK(workspaces_workspace.workspace_id) ON DELETE CASCADE
user_id             INT FK(users_user.id)
action              VARCHAR(100)  -- e.g. 'member_added', 'event_created'
target_type         VARCHAR(50)   -- e.g. 'user', 'event'
target_id           VARCHAR(100) NULLABLE
details             JSONB NULLABLE
timestamp           TIMESTAMP

INDEX(workspace_id, timestamp)
INDEX(user_id, timestamp)
INDEX(action, timestamp)
```

**Purpose:** Track all workspace activity for security auditing and compliance

### Tables to Remove

❌ `workspaces_role` - Not needed for simple Owner/Member system
❌ `workspaces_permission` - Not needed for simple system
❌ `workspaces_rolepermission` - Not needed for simple system
❌ `Profile` (uppercase, duplicate table) - Keep `profiles_profile` only
❌ `workspace` (lowercase, duplicate table) - Keep `workspaces_workspace` only

---

## 🔒 Authorization Rules

### Workspace Permissions

#### Owner Can:
- ✅ View workspace details (full access)
- ✅ Edit workspace (name, description, settings)
- ✅ Delete workspace (soft delete - sets is_active=False)
- ✅ Add members (direct addition)
- ✅ Remove members (except self - must transfer ownership first)
- ✅ Change member roles (promote/demote)
- ✅ Transfer ownership to another member
- ✅ View all workspace events (even private ones - override)
- ✅ View all members with full details
- ✅ View workspace audit log

#### Member Can:
- ✅ View workspace details (limited - name, description, member count)
- ✅ View other workspace members (names and profiles only)
- ✅ Create events in workspace
- ✅ View events they created or are participant in
- ✅ View public events in workspace
- ✅ Leave workspace voluntarily
- ❌ Add or remove other members
- ❌ Edit workspace settings
- ❌ Delete workspace
- ❌ View private events they're not participant in

### Event Permissions

#### Event Creator Can:
- ✅ View event details
- ✅ Edit all event fields (title, time, location, privacy)
- ✅ Delete event
- ✅ Add participants (share with workspace members)
- ✅ Remove participants
- ✅ Change event privacy (public ↔ private)

#### Event Participant Can:
- ✅ View event details
- ✅ Update their participation status (accept/decline)
- ❌ Edit event details
- ❌ Delete event
- ❌ Add/remove other participants

#### Workspace Owner Can (Override):
- ✅ View ALL events in workspace (public + private)
- ✅ Delete any event in workspace
- ❌ Edit events they didn't create

#### Non-Participant Member:
- ✅ View public events in workspace
- ❌ View private events (not shared with them)
- ❌ Edit or delete any events

### Profile Permissions

#### User Can:
- ✅ View own profile
- ✅ Edit own profile (name, avatar, bio)
- ✅ View profiles of users in shared workspaces
- ❌ View profiles of users in non-shared workspaces
- ❌ Edit other users' profiles

---

## 🛠️ Implementation Plan

### Phase 1: Database Schema Updates (Day 1, 4 hours)

#### Migration 1: Update `workspaces_workspace`
```python
# File: workspaces/migrations/000X_update_workspace_model.py

operations = [
    migrations.AddField(
        model_name='workspace',
        name='updated_at',
        field=models.DateTimeField(auto_now=True),
    ),
    migrations.AddField(
        model_name='workspace',
        name='is_active',
        field=models.BooleanField(default=True),
    ),
    migrations.AddIndex(
        model_name='workspace',
        index=models.Index(fields=['is_active'], name='workspace_active_idx'),
    ),
]
```

#### Migration 2: Simplify WorkspaceMember Role
```python
# File: workspaces/migrations/000X_simplify_workspacemember_role.py

def migrate_roles_to_simple(apps, schema_editor):
    """Convert FK-based roles to simple owner/member"""
    WorkspaceMember = apps.get_model('workspaces', 'WorkspaceMember')
    Workspace = apps.get_model('workspaces', 'Workspace')

    for workspace in Workspace.objects.all():
        # Set creator as owner
        WorkspaceMember.objects.filter(
            workspace=workspace,
            user=workspace.created_by
        ).update(role_simple='owner')

        # Set all others as members
        WorkspaceMember.objects.filter(
            workspace=workspace
        ).exclude(user=workspace.created_by).update(role_simple='member')

operations = [
    # Add temporary CharField
    migrations.AddField(
        model_name='workspacemember',
        name='role_simple',
        field=models.CharField(
            max_length=20,
            choices=[('owner','Owner'), ('member','Member')],
            default='member'
        ),
    ),
    # Migrate existing data
    migrations.RunPython(migrate_roles_to_simple),
    # Remove old ForeignKey
    migrations.RemoveField('workspacemember', 'role'),
    # Rename new field to 'role'
    migrations.RenameField('workspacemember', 'role_simple', 'role'),
    # Add new fields
    migrations.AddField(
        model_name='workspacemember',
        name='invited_by_id',
        field=models.ForeignKey(
            'users.User',
            on_delete=models.SET_NULL,
            null=True,
            related_name='invited_members'
        ),
    ),
    migrations.AddField(
        model_name='workspacemember',
        name='is_active',
        field=models.BooleanField(default=True),
    ),
    # Add indexes
    migrations.AddIndex(
        model_name='workspacemember',
        index=models.Index(fields=['workspace_id', 'is_active'], name='wsmember_ws_active_idx'),
    ),
]
```

#### Migration 3: Populate Workspace Members
```python
# File: workspaces/migrations/000X_populate_workspace_members.py

def populate_workspace_members(apps, schema_editor):
    """Assign all existing users to main workspace"""
    User = apps.get_model('users', 'User')
    Workspace = apps.get_model('workspaces', 'Workspace')
    WorkspaceMember = apps.get_model('workspaces', 'WorkspaceMember')

    # Main workspace UUID (from current DB)
    MAIN_WORKSPACE_ID = 'cdb5abfe-dc99-4394-ac0e-e50a2f21d960'

    try:
        main_workspace = Workspace.objects.get(workspace_id=MAIN_WORKSPACE_ID)
    except Workspace.DoesNotExist:
        print(f"Main workspace {MAIN_WORKSPACE_ID} not found, skipping population")
        return

    # Add all users to main workspace
    for user in User.objects.all():
        # Owner is the workspace creator
        if user == main_workspace.created_by:
            role = 'owner'
        else:
            role = 'member'

        # Get or create to handle duplicates
        WorkspaceMember.objects.get_or_create(
            workspace=main_workspace,
            user=user,
            defaults={
                'role': role,
                'is_active': True,
            }
        )
        print(f"Added {user.username} as {role} to {main_workspace.name}")

operations = [
    migrations.RunPython(populate_workspace_members),
]
```

#### Migration 4: Make Profile.user_id Unique
```python
# File: profiles/migrations/000X_make_user_unique.py

def remove_duplicate_profiles(apps, schema_editor):
    """Keep oldest profile per user, delete rest"""
    Profile = apps.get_model('profiles', 'Profile')

    # Find users with multiple profiles
    from django.db.models import Count
    duplicates = Profile.objects.values('user_id').annotate(
        count=Count('profile_id')
    ).filter(count__gt=1)

    for dup in duplicates:
        user_id = dup['user_id']
        profiles = Profile.objects.filter(user_id=user_id).order_by('created_at')

        # Keep oldest, delete rest
        keep = profiles.first()
        profiles.exclude(profile_id=keep.profile_id).delete()
        print(f"Removed {dup['count']-1} duplicate profile(s) for user {user_id}")

operations = [
    # Remove duplicates first
    migrations.RunPython(remove_duplicate_profiles),
    # Then add unique constraint
    migrations.AlterField(
        model_name='profile',
        name='user_id',
        field=models.OneToOneField(
            'users.User',
            on_delete=models.CASCADE,
        ),
    ),
]
```

#### Migration 5: Create Default Profiles
```python
# File: profiles/migrations/000X_create_default_profiles.py

def create_default_profiles(apps, schema_editor):
    """Create profiles for users without one"""
    User = apps.get_model('users', 'User')
    Profile = apps.get_model('profiles', 'Profile')

    for user in User.objects.all():
        if not Profile.objects.filter(user_id=user.id).exists():
            Profile.objects.create(
                user_id=user,
                full_name=user.username,  # Default to username
                avatar_url='',
                bio=''
            )
            print(f"Created default profile for {user.username}")

operations = [
    migrations.RunPython(create_default_profiles),
]
```

#### Migration 6: Update Events Model
```python
# File: events/migrations/000X_update_events_model.py

operations = [
    # Remove default values
    migrations.AlterField(
        model_name='event',
        name='created_by',
        field=models.ForeignKey(
            'users.User',
            on_delete=models.CASCADE,
            # NO default value
        ),
    ),
    migrations.AlterField(
        model_name='event',
        name='workspace_id',
        field=models.ForeignKey(
            'workspaces.Workspace',
            on_delete=models.CASCADE,
            # NO default value
        ),
    ),
    # Add is_private field
    migrations.AddField(
        model_name='event',
        name='is_private',
        field=models.BooleanField(default=True),
    ),
    # Add indexes
    migrations.AddIndex(
        model_name='event',
        index=models.Index(
            fields=['workspace_id', 'start_time'],
            name='event_ws_time_idx'
        ),
    ),
    migrations.AddIndex(
        model_name='event',
        index=models.Index(
            fields=['workspace_id', 'is_private'],
            name='event_ws_private_idx'
        ),
    ),
]
```

#### Migration 7: Make Existing Events Public
```python
# File: events/migrations/000X_make_existing_events_public.py

def make_existing_events_public(apps, schema_editor):
    """Set is_private=False for all existing events (backward compatibility)"""
    Event = apps.get_model('events', 'Event')

    count = Event.objects.all().update(is_private=False)
    print(f"Made {count} existing events public for backward compatibility")

operations = [
    migrations.RunPython(make_existing_events_public),
]
```

#### Migration 8: Create EventParticipant Table
```python
# File: events/migrations/000X_create_eventparticipant.py

operations = [
    migrations.CreateModel(
        name='EventParticipant',
        fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
            ('event', models.ForeignKey(
                'Event',
                on_delete=models.CASCADE,
                related_name='participants'
            )),
            ('user', models.ForeignKey(
                'users.User',
                on_delete=models.CASCADE,
                related_name='event_participations'
            )),
            ('added_by', models.ForeignKey(
                'users.User',
                on_delete=models.CASCADE,
                related_name='added_participants'
            )),
            ('added_at', models.DateTimeField(auto_now_add=True)),
            ('status', models.CharField(
                max_length=20,
                choices=[
                    ('accepted', 'Accepted'),
                    ('declined', 'Declined'),
                    ('pending', 'Pending')
                ],
                default='accepted'
            )),
        ],
        options={
            'unique_together': [('event', 'user')],
        },
    ),
    migrations.AddIndex(
        model_name='eventparticipant',
        index=models.Index(fields=['user'], name='evtpart_user_idx'),
    ),
    migrations.AddIndex(
        model_name='eventparticipant',
        index=models.Index(fields=['event', 'status'], name='evtpart_evt_status_idx'),
    ),
]
```

#### Migration 9: Create AuditLog Table
```python
# File: workspaces/migrations/000X_create_auditlog.py

operations = [
    migrations.CreateModel(
        name='AuditLog',
        fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
            ('workspace', models.ForeignKey(
                'Workspace',
                on_delete=models.CASCADE,
                related_name='audit_logs'
            )),
            ('user', models.ForeignKey(
                'users.User',
                on_delete=models.SET_NULL,
                null=True,
                related_name='audit_actions'
            )),
            ('action', models.CharField(max_length=100)),
            ('target_type', models.CharField(max_length=50, null=True, blank=True)),
            ('target_id', models.CharField(max_length=100, null=True, blank=True)),
            ('details', models.JSONField(null=True, blank=True)),
            ('timestamp', models.DateTimeField(auto_now_add=True)),
        ],
        options={
            'ordering': ['-timestamp'],
        },
    ),
    migrations.AddIndex(
        model_name='auditlog',
        index=models.Index(fields=['workspace', 'timestamp'], name='audit_ws_time_idx'),
    ),
    migrations.AddIndex(
        model_name='auditlog',
        index=models.Index(fields=['action', 'timestamp'], name='audit_action_time_idx'),
    ),
]
```

#### Migration 10: Drop Deprecated Tables
```python
# File: workspaces/migrations/000X_drop_deprecated_tables.py

operations = [
    migrations.RunSQL("DROP TABLE IF EXISTS workspaces_role CASCADE"),
    migrations.RunSQL("DROP TABLE IF EXISTS workspaces_permission CASCADE"),
    migrations.RunSQL("DROP TABLE IF EXISTS workspaces_rolepermission CASCADE"),
    migrations.RunSQL("DROP TABLE IF EXISTS \"Profile\" CASCADE"),  # Uppercase duplicate
    migrations.RunSQL("DROP TABLE IF EXISTS \"workspace\" CASCADE"),  # Lowercase duplicate
]
```

**Migration Order Summary:**
1. Update workspace model (add fields)
2. Simplify workspace member roles
3. Populate workspace members (assign users)
4. Make profile.user_id unique (remove duplicates)
5. Create default profiles
6. Update events model (remove defaults, add is_private)
7. Make existing events public (backward compatibility)
8. Create EventParticipant table
9. Create AuditLog table
10. Drop deprecated tables

---

### Phase 2: Core Authorization Backend (Day 1-2, 6 hours)

#### Create Permission Utilities

**File:** `backend/collabdesk/common/permissions.py`

```python
"""
Authorization utility functions for workspace and event permissions.
These functions contain the core business logic for access control.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from workspaces.models import Workspace, WorkspaceMember
    from events.models import Event
    from users.models import User


class WorkspacePermission:
    """Workspace-level permission checks"""

    @staticmethod
    def is_owner(user: 'User', workspace: 'Workspace') -> bool:
        """
        Check if user is workspace owner.

        Returns True if user is workspace owner, False otherwise.
        """
        from workspaces.models import WorkspaceMember

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user,
            role='owner',
            is_active=True
        ).exists()

    @staticmethod
    def is_member(user: 'User', workspace: 'Workspace') -> bool:
        """
        Check if user is workspace member (includes owner).

        Returns True if user has any role in workspace, False otherwise.
        """
        from workspaces.models import WorkspaceMember

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user,
            is_active=True
        ).exists()

    @staticmethod
    def can_manage_members(user: 'User', workspace: 'Workspace') -> bool:
        """
        Check if user can add/remove workspace members.

        Only owners can manage members.
        """
        return WorkspacePermission.is_owner(user, workspace)

    @staticmethod
    def can_edit_workspace(user: 'User', workspace: 'Workspace') -> bool:
        """
        Check if user can edit workspace settings.

        Only owners can edit workspace.
        """
        return WorkspacePermission.is_owner(user, workspace)

    @staticmethod
    def can_delete_workspace(user: 'User', workspace: 'Workspace') -> bool:
        """
        Check if user can delete workspace.

        Only owners can delete workspace.
        """
        return WorkspacePermission.is_owner(user, workspace)

    @staticmethod
    def get_user_workspaces(user: 'User'):
        """
        Get all workspaces user is a member of.

        Returns QuerySet of Workspace objects.
        """
        from workspaces.models import Workspace, WorkspaceMember

        workspace_ids = WorkspaceMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('workspace_id', flat=True)

        return Workspace.objects.filter(
            workspace_id__in=workspace_ids,
            is_active=True
        )


class EventPermission:
    """Event-level permission checks"""

    @staticmethod
    def can_view(user: 'User', event: 'Event') -> bool:
        """
        Check if user can view event.

        User can view if:
        1. Event is public and user is workspace member
        2. Event is private and user is creator
        3. Event is private and user is participant
        4. User is workspace owner (can see all)
        """
        # Check workspace membership first
        if not WorkspacePermission.is_member(user, event.workspace_id):
            return False

        # Workspace owners can see everything
        if WorkspacePermission.is_owner(user, event.workspace_id):
            return True

        # Public events visible to all workspace members
        if not event.is_private:
            return True

        # Private events: check if creator or participant
        if event.created_by == user:
            return True

        from events.models import EventParticipant
        return EventParticipant.objects.filter(
            event=event,
            user=user
        ).exists()

    @staticmethod
    def can_edit(user: 'User', event: 'Event') -> bool:
        """
        Check if user can edit event.

        Only event creator can edit.
        """
        return event.created_by == user

    @staticmethod
    def can_delete(user: 'User', event: 'Event') -> bool:
        """
        Check if user can delete event.

        Event creator or workspace owner can delete.
        """
        return (
            event.created_by == user or
            WorkspacePermission.is_owner(user, event.workspace_id)
        )

    @staticmethod
    def can_add_participants(user: 'User', event: 'Event') -> bool:
        """
        Check if user can add participants to event.

        Only event creator can add participants.
        """
        return event.created_by == user

    @staticmethod
    def can_remove_participant(user: 'User', event: 'Event', participant: 'User') -> bool:
        """
        Check if user can remove a participant from event.

        Event creator can remove anyone.
        Users can remove themselves.
        """
        return event.created_by == user or participant == user


class ProfilePermission:
    """Profile-level permission checks"""

    @staticmethod
    def can_view(user: 'User', profile_user: 'User') -> bool:
        """
        Check if user can view profile.

        User can view if:
        1. It's their own profile
        2. They share at least one workspace with profile owner
        """
        if user == profile_user:
            return True

        from workspaces.models import WorkspaceMember

        # Get user's workspace IDs
        user_workspaces = set(WorkspaceMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('workspace_id', flat=True))

        # Get profile owner's workspace IDs
        profile_workspaces = set(WorkspaceMember.objects.filter(
            user=profile_user,
            is_active=True
        ).values_list('workspace_id', flat=True))

        # Check for intersection (shared workspaces)
        return bool(user_workspaces & profile_workspaces)

    @staticmethod
    def can_edit(user: 'User', profile_user: 'User') -> bool:
        """
        Check if user can edit profile.

        Only own profile can be edited.
        """
        return user == profile_user
```

#### Create DRF Permission Classes

**File:** `backend/collabdesk/common/rest_permissions.py`

```python
"""
Django REST Framework permission classes.
These are used in views with permission_classes = [...]
"""

from rest_framework import permissions
from .permissions import WorkspacePermission, EventPermission, ProfilePermission


class IsWorkspaceOwner(permissions.BasePermission):
    """
    Permission: User must be workspace owner.

    Usage: permission_classes = [IsAuthenticated, IsWorkspaceOwner]
    """
    message = "You must be the workspace owner to perform this action."

    def has_object_permission(self, request, view, obj):
        """
        obj should be a Workspace instance.
        """
        return WorkspacePermission.is_owner(request.user, obj)


class IsWorkspaceMember(permissions.BasePermission):
    """
    Permission: User must be workspace member (includes owner).

    Usage: permission_classes = [IsAuthenticated, IsWorkspaceMember]
    """
    message = "You must be a member of this workspace."

    def has_object_permission(self, request, view, obj):
        """
        obj should be a Workspace instance or have a workspace_id attribute.
        """
        if hasattr(obj, 'workspace_id'):
            workspace = obj.workspace_id
        else:
            workspace = obj

        return WorkspacePermission.is_member(request.user, workspace)


class IsEventCreator(permissions.BasePermission):
    """
    Permission: User must be event creator.

    Usage: permission_classes = [IsAuthenticated, IsEventCreator]
    """
    message = "You must be the event creator to perform this action."

    def has_object_permission(self, request, view, obj):
        """
        obj should be an Event instance.
        """
        return obj.created_by == request.user


class CanViewEvent(permissions.BasePermission):
    """
    Permission: User can view event based on visibility rules.

    Usage: permission_classes = [IsAuthenticated, CanViewEvent]
    """
    message = "You do not have permission to view this event."

    def has_object_permission(self, request, view, obj):
        """
        obj should be an Event instance.
        """
        return EventPermission.can_view(request.user, obj)


class CanEditEvent(permissions.BasePermission):
    """
    Permission: User can edit event (creator only).
    """
    message = "Only the event creator can edit this event."

    def has_object_permission(self, request, view, obj):
        return EventPermission.can_edit(request.user, obj)


class CanDeleteEvent(permissions.BasePermission):
    """
    Permission: User can delete event (creator or workspace owner).
    """
    message = "You do not have permission to delete this event."

    def has_object_permission(self, request, view, obj):
        return EventPermission.can_delete(request.user, obj)


class CanViewProfile(permissions.BasePermission):
    """
    Permission: User can view profile (own or shared workspace).
    """
    message = "You do not have permission to view this profile."

    def has_object_permission(self, request, view, obj):
        """
        obj should be a Profile instance with user_id attribute.
        """
        profile_user = obj.user_id if hasattr(obj, 'user_id') else obj.user
        return ProfilePermission.can_view(request.user, profile_user)


class IsProfileOwner(permissions.BasePermission):
    """
    Permission: User must be profile owner.
    """
    message = "You can only edit your own profile."

    def has_object_permission(self, request, view, obj):
        """
        obj should be a Profile instance.
        """
        profile_user = obj.user_id if hasattr(obj, 'user_id') else obj.user
        return request.user == profile_user
```

#### Create Audit Logging Utility

**File:** `backend/collabdesk/common/audit.py`

```python
"""
Audit logging utilities for tracking workspace actions.
"""

from typing import Optional, Dict, Any
from workspaces.models import AuditLog


def log_action(
    workspace,
    user,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Create an audit log entry.

    Args:
        workspace: Workspace instance
        user: User instance who performed action
        action: Action name (e.g., 'member_added', 'event_created')
        target_type: Type of target object (e.g., 'user', 'event')
        target_id: ID of target object
        details: Additional details as JSON

    Example:
        log_action(
            workspace=workspace,
            user=request.user,
            action='member_added',
            target_type='user',
            target_id=str(new_member.id),
            details={'role': 'member'}
        )
    """
    AuditLog.objects.create(
        workspace=workspace,
        user=user,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {}
    )


# Common action constants
class AuditAction:
    # Workspace actions
    WORKSPACE_CREATED = 'workspace_created'
    WORKSPACE_UPDATED = 'workspace_updated'
    WORKSPACE_DELETED = 'workspace_deleted'

    # Member actions
    MEMBER_ADDED = 'member_added'
    MEMBER_REMOVED = 'member_removed'
    MEMBER_ROLE_CHANGED = 'member_role_changed'
    MEMBER_LEFT = 'member_left'
    OWNERSHIP_TRANSFERRED = 'ownership_transferred'

    # Event actions
    EVENT_CREATED = 'event_created'
    EVENT_UPDATED = 'event_updated'
    EVENT_DELETED = 'event_deleted'
    EVENT_PARTICIPANT_ADDED = 'event_participant_added'
    EVENT_PARTICIPANT_REMOVED = 'event_participant_removed'
```

---

### Phase 3: Workspace Management API (Day 2, 6 hours)

#### Update Models

**File:** `backend/collabdesk/workspaces/models.py`

```python
# Update the models to match the new schema

class Workspace(models.Model):
    workspace_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_workspaces"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # NEW
    is_active = models.BooleanField(default=True)  # NEW

    class Meta:
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('member', 'Member'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workspaces")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')  # CHANGED
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invited_members'
    )  # NEW
    is_active = models.BooleanField(default=True)  # NEW

    class Meta:
        unique_together = ("workspace", "user")
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['workspace', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.workspace.name} ({self.role})"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name='audit_logs'
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_actions'
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50, null=True, blank=True)
    target_id = models.CharField(max_length=100, null=True, blank=True)
    details = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['workspace', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"

# Remove Role, Permission, RolePermission models
```

#### Create Serializers

**File:** `backend/collabdesk/workspaces/serializers.py`

```python
from rest_framework import serializers
from .models import Workspace, WorkspaceMember, AuditLog
from profiles.models import Profile


class UserProfileSerializer(serializers.Serializer):
    """Nested user with profile info"""
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    full_name = serializers.CharField(source='profile.full_name', default='')
    avatar_url = serializers.CharField(source='profile.avatar_url', default='')


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    invited_by = UserProfileSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            'id', 'workspace', 'user', 'role',
            'joined_at', 'invited_by', 'is_active'
        ]
        read_only_fields = ['id', 'joined_at']


class WorkspaceMemberCreateSerializer(serializers.Serializer):
    """For adding members"""
    user_id = serializers.IntegerField(required=True)
    role = serializers.ChoiceField(
        choices=['owner', 'member'],
        default='member'
    )


class WorkspaceListSerializer(serializers.ModelSerializer):
    """Minimal workspace info for list view"""
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['workspace_id', 'name', 'member_count', 'my_role', 'created_at']

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_my_role(self, obj):
        user = self.context['request'].user
        member = obj.members.filter(user=user, is_active=True).first()
        return member.role if member else None


class WorkspaceDetailSerializer(serializers.ModelSerializer):
    """Full workspace details"""
    created_by = UserProfileSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'workspace_id', 'name', 'description',
            'created_by', 'member_count', 'is_owner', 'my_role',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['workspace_id', 'created_by', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_is_owner(self, obj):
        user = self.context['request'].user
        from common.permissions import WorkspacePermission
        return WorkspacePermission.is_owner(user, obj)

    def get_my_role(self, obj):
        user = self.context['request'].user
        member = obj.members.filter(user=user, is_active=True).first()
        return member.role if member else None


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    """For creating workspaces"""
    class Meta:
        model = Workspace
        fields = ['name', 'description']


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'target_type', 'target_id', 'details', 'timestamp']
```

#### Create Views

**File:** `backend/collabdesk/workspaces/views.py`

```python
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Workspace, WorkspaceMember, AuditLog
from .serializers import (
    WorkspaceListSerializer,
    WorkspaceDetailSerializer,
    WorkspaceCreateSerializer,
    WorkspaceMemberSerializer,
    WorkspaceMemberCreateSerializer,
    AuditLogSerializer,
)
from common.rest_permissions import IsWorkspaceOwner, IsWorkspaceMember
from common.permissions import WorkspacePermission
from common.audit import log_action, AuditAction

User = get_user_model()


class WorkspaceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/workspaces/ - List user's workspaces
    POST /api/workspaces/ - Create new workspace
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkspaceCreateSerializer
        return WorkspaceListSerializer

    def get_queryset(self):
        """Return only workspaces user is member of"""
        return WorkspacePermission.get_user_workspaces(self.request.user)

    def perform_create(self, serializer):
        """Create workspace and add creator as owner"""
        workspace = serializer.save(created_by=self.request.user)

        # Add creator as owner
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role='owner',
            is_active=True
        )

        # Log creation
        log_action(
            workspace=workspace,
            user=self.request.user,
            action=AuditAction.WORKSPACE_CREATED
        )


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/workspaces/<uuid>/ - Get workspace details
    PATCH  /api/workspaces/<uuid>/ - Update workspace (owner only)
    DELETE /api/workspaces/<uuid>/ - Delete workspace (owner only)
    """
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceDetailSerializer
    lookup_field = 'workspace_id'
    lookup_url_kwarg = 'workspace_id'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), IsWorkspaceMember()]
        else:  # PATCH, DELETE
            return [IsAuthenticated(), IsWorkspaceOwner()]

    def perform_update(self, serializer):
        workspace = serializer.save()
        log_action(
            workspace=workspace,
            user=self.request.user,
            action=AuditAction.WORKSPACE_UPDATED,
            details={'changes': serializer.validated_data}
        )

    def perform_destroy(self, instance):
        """Soft delete workspace"""
        instance.is_active = False
        instance.save()

        log_action(
            workspace=instance,
            user=self.request.user,
            action=AuditAction.WORKSPACE_DELETED
        )


class WorkspaceMemberListView(APIView):
    """
    GET  /api/workspaces/<uuid>/members/ - List workspace members
    POST /api/workspaces/<uuid>/members/ - Add member (owner only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        """List all workspace members"""
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Check membership
        if not WorkspacePermission.is_member(request.user, workspace):
            return Response(
                {'detail': 'You must be a workspace member to view members.'},
                status=status.HTTP_403_FORBIDDEN
            )

        members = WorkspaceMember.objects.filter(
            workspace=workspace,
            is_active=True
        ).select_related('user', 'invited_by')

        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data)

    def post(self, request, workspace_id):
        """Add member to workspace (owner only)"""
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Check ownership
        if not WorkspacePermission.is_owner(request.user, workspace):
            return Response(
                {'detail': 'Only workspace owners can add members.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WorkspaceMemberCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_id = serializer.validated_data['user_id']
        role = serializer.validated_data['role']

        # Get user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already member
        existing = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user
        ).first()

        if existing and existing.is_active:
            return Response(
                {'detail': 'User is already a member of this workspace.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or reactivate membership
        if existing:
            existing.is_active = True
            existing.role = role
            existing.invited_by = request.user
            existing.save()
            member = existing
        else:
            member = WorkspaceMember.objects.create(
                workspace=workspace,
                user=user,
                role=role,
                invited_by=request.user,
                is_active=True
            )

        # Log action
        log_action(
            workspace=workspace,
            user=request.user,
            action=AuditAction.MEMBER_ADDED,
            target_type='user',
            target_id=str(user.id),
            details={'role': role}
        )

        serializer = WorkspaceMemberSerializer(member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkspaceMemberDetailView(APIView):
    """
    DELETE /api/workspaces/<uuid>/members/<user_id>/ - Remove member (owner only)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, workspace_id, user_id):
        """Remove member from workspace"""
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        # Check ownership
        if not WorkspacePermission.is_owner(request.user, workspace):
            return Response(
                {'detail': 'Only workspace owners can remove members.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get member
        try:
            member = WorkspaceMember.objects.get(
                workspace=workspace,
                user_id=user_id,
                is_active=True
            )
        except WorkspaceMember.DoesNotExist:
            return Response(
                {'detail': 'Member not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cannot remove self if owner (must transfer ownership first)
        if member.user == request.user and member.role == 'owner':
            return Response(
                {'detail': 'Owners cannot remove themselves. Transfer ownership first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete membership
        member.is_active = False
        member.save()

        # Log action
        log_action(
            workspace=workspace,
            user=request.user,
            action=AuditAction.MEMBER_REMOVED,
            target_type='user',
            target_id=str(user_id)
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceTransferOwnershipView(APIView):
    """
    POST /api/workspaces/<uuid>/transfer-ownership/ - Transfer ownership
    """
    permission_classes = [IsAuthenticated, IsWorkspaceOwner]

    def post(self, request, workspace_id):
        """Transfer ownership to another member"""
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        new_owner_id = request.data.get('new_owner_id')
        if not new_owner_id:
            return Response(
                {'detail': 'new_owner_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get new owner's membership
        try:
            new_owner_member = WorkspaceMember.objects.get(
                workspace=workspace,
                user_id=new_owner_id,
                is_active=True
            )
        except WorkspaceMember.DoesNotExist:
            return Response(
                {'detail': 'User is not a member of this workspace.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get current owner's membership
        current_owner_member = WorkspaceMember.objects.get(
            workspace=workspace,
            user=request.user,
            is_active=True
        )

        # Swap roles
        new_owner_member.role = 'owner'
        new_owner_member.save()

        current_owner_member.role = 'member'
        current_owner_member.save()

        # Log action
        log_action(
            workspace=workspace,
            user=request.user,
            action=AuditAction.OWNERSHIP_TRANSFERRED,
            target_type='user',
            target_id=str(new_owner_id),
            details={
                'from_user': str(request.user.id),
                'to_user': str(new_owner_id)
            }
        )

        return Response({
            'detail': 'Ownership transferred successfully.',
            'new_owner': new_owner_member.user.username
        })


class WorkspaceLeaveView(APIView):
    """
    POST /api/workspaces/<uuid>/leave/ - Leave workspace
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def post(self, request, workspace_id):
        """Leave workspace"""
        workspace = get_object_or_404(Workspace, workspace_id=workspace_id)

        member = WorkspaceMember.objects.get(
            workspace=workspace,
            user=request.user,
            is_active=True
        )

        # Cannot leave if owner
        if member.role == 'owner':
            return Response(
                {'detail': 'Owners cannot leave. Transfer ownership first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete membership
        member.is_active = False
        member.save()

        # Log action
        log_action(
            workspace=workspace,
            user=request.user,
            action=AuditAction.MEMBER_LEFT
        )

        return Response({'detail': 'You have left the workspace.'})


class WorkspaceAuditLogView(generics.ListAPIView):
    """
    GET /api/workspaces/<uuid>/audit-log/ - View audit log (owner only)
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceOwner]

    def get_queryset(self):
        workspace_id = self.kwargs['workspace_id']
        return AuditLog.objects.filter(workspace_id=workspace_id)
```

#### Update URLs

**File:** `backend/collabdesk/workspaces/urls.py`

```python
from django.urls import path
from .views import (
    WorkspaceListCreateView,
    WorkspaceDetailView,
    WorkspaceMemberListView,
    WorkspaceMemberDetailView,
    WorkspaceTransferOwnershipView,
    WorkspaceLeaveView,
    WorkspaceAuditLogView,
)

app_name = 'workspaces'

urlpatterns = [
    # Workspace CRUD
    path('', WorkspaceListCreateView.as_view(), name='workspace-list'),
    path('<uuid:workspace_id>/', WorkspaceDetailView.as_view(), name='workspace-detail'),

    # Member management
    path('<uuid:workspace_id>/members/', WorkspaceMemberListView.as_view(), name='workspace-members'),
    path('<uuid:workspace_id>/members/<int:user_id>/', WorkspaceMemberDetailView.as_view(), name='workspace-member-detail'),

    # Ownership & leaving
    path('<uuid:workspace_id>/transfer-ownership/', WorkspaceTransferOwnershipView.as_view(), name='workspace-transfer-ownership'),
    path('<uuid:workspace_id>/leave/', WorkspaceLeaveView.as_view(), name='workspace-leave'),

    # Audit log
    path('<uuid:workspace_id>/audit-log/', WorkspaceAuditLogView.as_view(), name='workspace-audit-log'),
]
```

---

### Phase 4: Event Authorization (Day 2-3, 6 hours)

#### Update Event Models

**File:** `backend/collabdesk/events/models.py`

```python
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Event(models.Model):
    class EventType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", _("Individual Event")
        GROUP = "GROUP", _("Group Event")

    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, default="none")
    description = models.CharField(max_length=1000, default="none")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    event_type = models.CharField(
        max_length=20, choices=EventType, default=EventType.GROUP
    )
    location = models.CharField(max_length=100, default="none")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_events'
        # NO DEFAULT VALUE
    )
    workspace_id = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name='events'
        # NO DEFAULT VALUE
    )
    is_private = models.BooleanField(default=True)  # NEW
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=['workspace_id', 'start_time']),
            models.Index(fields=['created_by']),
            models.Index(fields=['workspace_id', 'is_private']),
        ]

    def __str__(self):
        return self.title


class EventParticipant(models.Model):
    """
    Participants of an event (for private event sharing).
    When event is shared with a user, they become a participant.
    """
    STATUS_CHOICES = [
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('pending', 'Pending'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_participations'
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='added_participants'
    )
    added_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='accepted'  # Auto-accept when shared
    )

    class Meta:
        unique_together = [('event', 'user')]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"
```

#### Create Event Serializers

**File:** `backend/collabdesk/events/serializers.py`

```python
from rest_framework import serializers
from .models import Event, EventParticipant
from workspaces.serializers import UserProfileSerializer


class EventParticipantSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    added_by = UserProfileSerializer(read_only=True)

    class Meta:
        model = EventParticipant
        fields = ['id', 'user', 'added_by', 'status', 'added_at']


class EventListSerializer(serializers.ModelSerializer):
    """Minimal event info for list view"""
    workspace_name = serializers.CharField(source='workspace_id.name', read_only=True)
    creator_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Event
        fields = [
            'event_id', 'title', 'start_time', 'end_time',
            'event_type', 'location', 'is_private',
            'workspace_name', 'creator_name'
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    """Full event details"""
    workspace = serializers.SerializerMethodField()
    created_by = UserProfileSerializer(read_only=True)
    participants = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_add_participants = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'event_id', 'title', 'description',
            'start_time', 'end_time', 'event_type', 'location',
            'workspace', 'created_by', 'is_private',
            'participants', 'can_edit', 'can_delete', 'can_add_participants',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['event_id', 'created_by', 'workspace', 'created_at', 'updated_at']

    def get_workspace(self, obj):
        return {
            'workspace_id': str(obj.workspace_id.workspace_id),
            'name': obj.workspace_id.name
        }

    def get_participants(self, obj):
        # Only show participants if user can view them
        user = self.context['request'].user
        from common.permissions import EventPermission

        if EventPermission.can_view(user, obj):
            participants = obj.participants.all()
            return EventParticipantSerializer(participants, many=True).data
        return None

    def get_can_edit(self, obj):
        user = self.context['request'].user
        from common.permissions import EventPermission
        return EventPermission.can_edit(user, obj)

    def get_can_delete(self, obj):
        user = self.context['request'].user
        from common.permissions import EventPermission
        return EventPermission.can_delete(user, obj)

    def get_can_add_participants(self, obj):
        user = self.context['request'].user
        from common.permissions import EventPermission
        return EventPermission.can_add_participants(user, obj)


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """For creating/updating events"""
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'start_time', 'end_time',
            'event_type', 'location', 'workspace_id', 'is_private'
        ]

    def validate_workspace_id(self, value):
        """Ensure user is member of workspace"""
        user = self.context['request'].user
        from common.permissions import WorkspacePermission

        if not WorkspacePermission.is_member(user, value):
            raise serializers.ValidationError(
                "You must be a member of the workspace to create events in it."
            )
        return value


class EventParticipantAddSerializer(serializers.Serializer):
    """For adding participants to event"""
    user_id = serializers.IntegerField(required=True)
```

#### Create Event Views

**File:** `backend/collabdesk/events/views.py`

```python
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Event, EventParticipant
from .serializers import (
    EventListSerializer,
    EventDetailSerializer,
    EventCreateUpdateSerializer,
    EventParticipantSerializer,
    EventParticipantAddSerializer,
)
from common.rest_permissions import (
    IsWorkspaceMember,
    CanViewEvent,
    CanEditEvent,
    CanDeleteEvent,
)
from common.permissions import EventPermission, WorkspacePermission
from common.audit import log_action, AuditAction

User = get_user_model()


class EventListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/events/ - List events user can view
    POST /api/events/ - Create new event
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EventCreateUpdateSerializer
        return EventListSerializer

    def get_queryset(self):
        """
        Return events user can view:
        1. Events they created
        2. Events they participate in (private events shared with them)
        3. Public events in their workspaces
        4. All events if workspace owner
        """
        user = self.request.user

        # Get user's workspace IDs
        workspace_ids = WorkspacePermission.get_user_workspaces(user).values_list(
            'workspace_id', flat=True
        )

        # Get workspaces where user is owner
        from workspaces.models import WorkspaceMember
        owner_workspace_ids = WorkspaceMember.objects.filter(
            user=user,
            role='owner',
            is_active=True
        ).values_list('workspace_id', flat=True)

        # Build query
        query = Q(workspace_id__in=workspace_ids) & (
            Q(created_by=user) |  # Created by user
            Q(is_private=False) |  # Public events in workspace
            Q(participants__user=user) |  # Participant in private event
            Q(workspace_id__in=owner_workspace_ids)  # Owner can see all
        )

        # Apply filters from query params
        queryset = Event.objects.filter(query).distinct()

        # Filter by workspace if specified
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)

        # Filter by date range if specified
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(start_time__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_time__lte=date_to)

        return queryset.select_related('workspace_id', 'created_by').order_by('start_time')

    def perform_create(self, serializer):
        """Create event and add creator as participant if private"""
        event = serializer.save(created_by=self.request.user)

        # If private, add creator as participant
        if event.is_private:
            EventParticipant.objects.create(
                event=event,
                user=self.request.user,
                added_by=self.request.user,
                status='accepted'
            )

        # Log action
        log_action(
            workspace=event.workspace_id,
            user=self.request.user,
            action=AuditAction.EVENT_CREATED,
            target_type='event',
            target_id=str(event.event_id),
            details={'title': event.title, 'is_private': event.is_private}
        )


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/events/<uuid>/ - Get event details
    PATCH  /api/events/<uuid>/ - Update event (creator only)
    DELETE /api/events/<uuid>/ - Delete event (creator or owner)
    """
    queryset = Event.objects.all()
    lookup_field = 'event_id'
    lookup_url_kwarg = 'event_id'

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return EventCreateUpdateSerializer
        return EventDetailSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), CanViewEvent()]
        elif self.request.method in ['PATCH', 'PUT']:
            return [IsAuthenticated(), CanEditEvent()]
        else:  # DELETE
            return [IsAuthenticated(), CanDeleteEvent()]

    def perform_update(self, serializer):
        event = serializer.save()
        log_action(
            workspace=event.workspace_id,
            user=self.request.user,
            action=AuditAction.EVENT_UPDATED,
            target_type='event',
            target_id=str(event.event_id),
            details={'changes': serializer.validated_data}
        )

    def perform_destroy(self, instance):
        log_action(
            workspace=instance.workspace_id,
            user=self.request.user,
            action=AuditAction.EVENT_DELETED,
            target_type='event',
            target_id=str(instance.event_id),
            details={'title': instance.title}
        )
        instance.delete()


class EventParticipantListView(APIView):
    """
    GET  /api/events/<uuid>/participants/ - List event participants
    POST /api/events/<uuid>/participants/ - Add participant (creator only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        """List event participants"""
        event = get_object_or_404(Event, event_id=event_id)

        # Check view permission
        if not EventPermission.can_view(request.user, event):
            return Response(
                {'detail': 'You do not have permission to view this event.'},
                status=status.HTTP_403_FORBIDDEN
            )

        participants = event.participants.all()
        serializer = EventParticipantSerializer(participants, many=True)
        return Response(serializer.data)

    def post(self, request, event_id):
        """Add participant to event"""
        event = get_object_or_404(Event, event_id=event_id)

        # Check add permission
        if not EventPermission.can_add_participants(request.user, event):
            return Response(
                {'detail': 'Only the event creator can add participants.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = EventParticipantAddSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_id = serializer.validated_data['user_id']

        # Get user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is workspace member
        if not WorkspacePermission.is_member(user, event.workspace_id):
            return Response(
                {'detail': 'User must be a workspace member to be added to events.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already participant
        if EventParticipant.objects.filter(event=event, user=user).exists():
            return Response(
                {'detail': 'User is already a participant.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add participant
        participant = EventParticipant.objects.create(
            event=event,
            user=user,
            added_by=request.user,
            status='accepted'
        )

        # Log action
        log_action(
            workspace=event.workspace_id,
            user=request.user,
            action=AuditAction.EVENT_PARTICIPANT_ADDED,
            target_type='event',
            target_id=str(event.event_id),
            details={'participant_id': str(user.id), 'participant_name': user.username}
        )

        serializer = EventParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EventParticipantDetailView(APIView):
    """
    DELETE /api/events/<uuid>/participants/<user_id>/ - Remove participant
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id, user_id):
        """Remove participant from event"""
        event = get_object_or_404(Event, event_id=event_id)

        # Event creator can remove anyone, users can remove themselves
        participant_user = get_object_or_404(User, id=user_id)

        if not EventPermission.can_remove_participant(request.user, event, participant_user):
            return Response(
                {'detail': 'You do not have permission to remove this participant.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get and delete participant
        try:
            participant = EventParticipant.objects.get(
                event=event,
                user_id=user_id
            )
        except EventParticipant.DoesNotExist:
            return Response(
                {'detail': 'Participant not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        participant.delete()

        # Log action
        log_action(
            workspace=event.workspace_id,
            user=request.user,
            action=AuditAction.EVENT_PARTICIPANT_REMOVED,
            target_type='event',
            target_id=str(event.event_id),
            details={'participant_id': str(user_id)}
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class EventRespondView(APIView):
    """
    PATCH /api/events/<uuid>/respond/ - Accept/decline event participation
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        """Update participation status"""
        event = get_object_or_404(Event, event_id=event_id)

        # Get user's participation
        try:
            participant = EventParticipant.objects.get(
                event=event,
                user=request.user
            )
        except EventParticipant.DoesNotExist:
            return Response(
                {'detail': 'You are not a participant of this event.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update status
        new_status = request.data.get('status')
        if new_status not in ['accepted', 'declined']:
            return Response(
                {'detail': 'Status must be "accepted" or "declined".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        participant.status = new_status
        participant.save()

        serializer = EventParticipantSerializer(participant)
        return Response(serializer.data)
```

#### Update Event URLs

**File:** `backend/collabdesk/events/urls.py`

```python
from django.urls import path
from .views import (
    EventListCreateView,
    EventDetailView,
    EventParticipantListView,
    EventParticipantDetailView,
    EventRespondView,
)

app_name = 'events'

urlpatterns = [
    # Event CRUD
    path('', EventListCreateView.as_view(), name='event-list'),
    path('<uuid:event_id>/', EventDetailView.as_view(), name='event-detail'),

    # Participants
    path('<uuid:event_id>/participants/', EventParticipantListView.as_view(), name='event-participants'),
    path('<uuid:event_id>/participants/<int:user_id>/', EventParticipantDetailView.as_view(), name='event-participant-detail'),

    # Respond to event
    path('<uuid:event_id>/respond/', EventRespondView.as_view(), name='event-respond'),
]
```

---

### Phase 5: Profile Authorization (Day 3, 2 hours)

#### Update Profile Views

**File:** `backend/collabdesk/profiles/views.py`

```python
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Profile
from .serializers import ProfileSerializer
from common.rest_permissions import CanViewProfile, IsProfileOwner
from workspaces.models import WorkspaceMember


class ProfileListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/profiles/ - List profiles of users in shared workspaces
    POST /api/profiles/ - Create profile (if doesn't exist)
    """
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return profiles of users in shared workspaces.
        """
        user = self.request.user

        # Get user's workspace IDs
        user_workspace_ids = set(WorkspaceMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('workspace_id', flat=True))

        # Get user IDs in those workspaces
        user_ids_in_shared_workspaces = WorkspaceMember.objects.filter(
            workspace_id__in=user_workspace_ids,
            is_active=True
        ).values_list('user_id', flat=True).distinct()

        # Return profiles of those users
        return Profile.objects.filter(
            user_id__in=user_ids_in_shared_workspaces
        ).select_related('user_id')

    def perform_create(self, serializer):
        """Auto-set user_id to current user"""
        serializer.save(user_id=self.request.user)


class ProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/profiles/<uuid>/ - Get profile (if shared workspace)
    PATCH  /api/profiles/<uuid>/ - Update profile (own only)
    DELETE /api/profiles/<uuid>/ - Delete profile (own only)
    """
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'profile_id'
    lookup_url_kwarg = 'profile_id'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), CanViewProfile()]
        else:  # PATCH, DELETE
            return [IsAuthenticated(), IsProfileOwner()]
```

---

### Phase 6: Frontend Implementation (Day 3-4, 8 hours)

#### Update API Client

**File:** `frontend/src/lib/api.ts`

```typescript
// ... existing code ...

// ============================================
// WORKSPACE MANAGEMENT
// ============================================

export type WorkspaceMember = {
  id: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  role: 'owner' | 'member';
  joined_at: string;
};

export type WorkspaceDetail = {
  workspace_id: string;
  name: string;
  description: string;
  created_by: {
    id: number;
    username: string;
  };
  member_count: number;
  is_owner: boolean;
  my_role: 'owner' | 'member' | null;
  created_at: string;
  updated_at: string;
};

export async function createWorkspace(name: string, description?: string): Promise<WorkspaceDetail> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to create workspaces');
    }
    throw new Error('Failed to create workspace');
  }

  return response.json();
}

export async function getMyWorkspaces(): Promise<WorkspaceListItem[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to view workspaces');
    }
    throw new Error('Failed to fetch workspaces');
  }

  return response.json();
}

export async function getWorkspaceDetails(workspaceId: string): Promise<WorkspaceDetail> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to view this workspace');
    }
    if (response.status === 404) {
      throw new Error('Workspace not found');
    }
    throw new Error('Failed to fetch workspace details');
  }

  return response.json();
}

export async function updateWorkspace(workspaceId: string, data: { name?: string; description?: string }): Promise<WorkspaceDetail> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Only workspace owners can update workspace settings');
    }
    throw new Error('Failed to update workspace');
  }

  return response.json();
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Only workspace owners can delete workspaces');
    }
    throw new Error('Failed to delete workspace');
  }
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You must be a workspace member to view members');
    }
    throw new Error('Failed to fetch members');
  }

  return response.json();
}

export async function addWorkspaceMember(workspaceId: string, userId: number, role: 'owner' | 'member' = 'member'): Promise<WorkspaceMember> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to add member';
    if (response.status === 403) {
      throw new Error('Only workspace owners can add members');
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function removeWorkspaceMember(workspaceId: string, userId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/${userId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to remove member';
    if (response.status === 403) {
      throw new Error('Only workspace owners can remove members');
    }
    throw new Error(detail);
  }
}

export async function transferWorkspaceOwnership(workspaceId: string, newOwnerId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/transfer-ownership/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_owner_id: newOwnerId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to transfer ownership';
    throw new Error(detail);
  }
}

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/leave/`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to leave workspace';
    throw new Error(detail);
  }
}

// ============================================
// EVENT PARTICIPANTS
// ============================================

export type EventParticipant = {
  id: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  status: 'accepted' | 'declined' | 'pending';
  added_at: string;
};

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/${eventId}/participants/`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to view event participants');
    }
    throw new Error('Failed to fetch participants');
  }

  return response.json();
}

export async function addEventParticipant(eventId: string, userId: number): Promise<EventParticipant> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/${eventId}/participants/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to add participant';
    if (response.status === 403) {
      throw new Error('Only the event creator can add participants');
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function removeEventParticipant(eventId: string, userId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/${eventId}/participants/${userId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail || 'Failed to remove participant';
    throw new Error(detail);
  }
}

export async function respondToEvent(eventId: string, status: 'accepted' | 'declined'): Promise<EventParticipant> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/${eventId}/respond/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update participation status');
  }

  return response.json();
}

// ============================================
// UPDATED EVENT FUNCTIONS
// ============================================

export async function getEvents(
  workspaceId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<BackendEvent[]> {
  const params = new URLSearchParams();
  if (workspaceId) params.append('workspace_id', workspaceId);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);

  const url = `${API_BASE_URL}/api/events/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to view events');
    }
    throw new Error('Failed to fetch events');
  }

  return response.json();
}

// Update CreateEventPayload to remove created_by
export type CreateEventPayload = {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'INDIVIDUAL' | 'GROUP';
  location?: string;
  workspace_id: string;
  is_private?: boolean; // NEW
  // created_by is auto-set by backend
};
```

#### Update Dashboard to Remove Hardcoded User ID

**File:** `frontend/src/components/dashboard/Dashboard.tsx`

```typescript
// Remove hardcoded user_id
export function Dashboard({ workspaceId }: { workspaceId: string }) {
  // ... existing code ...

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (!workspaceId) return;

    console.log("🔁 Fetching workspace info for:", workspaceId);
    setLoading(true);
    setError("");

    // REMOVE: const user_id = 1;
    // Call API without user_id - backend uses authenticated user
    fetchWorkspaceInformation(workspaceId)
      .then((data) => {
        setWorkspace(data);
      })
      .catch((err) => {
        console.error("Error fetching workspace:", err);
        setError("Failed to load workspace.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, isAuthenticated, authLoading]);

  // ... rest of component
}
```

#### Update Event Modals to Remove Hardcoded User ID

**File:** `frontend/src/components/modals/UnavailabilityModal.tsx`

```typescript
// Remove created_by from payload
const response = await createEvent({
  title: reason.trim() || "Unavailable",
  description: "User marked as unavailable",
  start_time: st.toISOString(),
  end_time: et.toISOString(),
  event_type: "GROUP",
  location: "none",
  workspace_id: "cdb5abfe-dc99-4394-ac0e-e50a2f21d960", // TODO: Get from context
  is_private: true, // Make unavailability events private
});
```

**File:** `frontend/src/components/modals/SmartScheduleModal.tsx`

```typescript
// Remove created_by from payload
const response = await createEvent({
  title: title.trim(),
  description: `Meeting with ${selected.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ")}`,
  start_time: slot.start.toISOString(),
  end_time: slot.end.toISOString(),
  event_type: "INDIVIDUAL",
  location: "none",
  workspace_id: "cdb5abfe-dc99-4394-ac0e-e50a2f21d960", // TODO: Get from context
  is_private: true, // Make scheduled meetings private by default
});
```

#### Create Workspace Management UI Components

**File:** `frontend/src/components/workspace/WorkspaceSelector.tsx`

```typescript
import { useState, useEffect } from 'react';
import { getMyWorkspaces, type WorkspaceListItem } from '../../lib/api';

export function WorkspaceSelector({
  currentWorkspaceId,
  onSelect,
}: {
  currentWorkspaceId: string;
  onSelect: (workspaceId: string) => void;
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWorkspaces()
      .then(setWorkspaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading workspaces...</div>;

  return (
    <select
      value={currentWorkspaceId}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded border px-3 py-2"
    >
      {workspaces.map((ws) => (
        <option key={ws.workspace_id} value={ws.workspace_id}>
          {ws.name}
        </option>
      ))}
    </select>
  );
}
```

**File:** `frontend/src/components/workspace/MemberManagement.tsx`

```typescript
import { useState, useEffect } from 'react';
import {
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  type WorkspaceMember,
} from '../../lib/api';

export function MemberManagement({
  workspaceId,
  isOwner,
}: {
  workspaceId: string;
  isOwner: boolean;
}) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await getWorkspaceMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await addWorkspaceMember(workspaceId, userId);
      await loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Remove this member?')) return;

    try {
      await removeWorkspaceMember(workspaceId, userId);
      await loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (loading) return <div>Loading members...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Members ({members.length})</h3>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between border p-3 rounded">
            <div className="flex items-center gap-3">
              {member.user.avatar_url && (
                <img
                  src={member.user.avatar_url}
                  alt={member.user.username}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{member.user.full_name || member.user.username}</div>
                <div className="text-sm text-gray-500">{member.role}</div>
              </div>
            </div>

            {isOwner && member.role !== 'owner' && (
              <button
                onClick={() => handleRemoveMember(member.user.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="mt-4 pt-4 border-t">
          {/* TODO: Add member search/input */}
          <p className="text-sm text-gray-500">
            Add member functionality coming soon
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 7: Testing (Day 4, 4 hours)

#### Backend Unit Tests

**File:** `backend/collabdesk/workspaces/tests.py`

Add comprehensive tests for workspace authorization:

```python
class WorkspaceAuthorizationTests(TestCase):
    """Test workspace-based access control"""

    def test_owner_can_add_members(self):
        """Owners can add members to workspace"""
        pass

    def test_member_cannot_add_members(self):
        """Members cannot add other members"""
        pass

    def test_owner_can_remove_members(self):
        """Owners can remove members"""
        pass

    def test_owner_cannot_remove_self(self):
        """Owners cannot remove themselves (must transfer first)"""
        pass

    def test_ownership_transfer_works(self):
        """Ownership can be transferred to another member"""
        pass
```

**File:** `backend/collabdesk/events/tests.py`

Add tests for event authorization:

```python
class EventAuthorizationTests(TestCase):
    """Test event-based access control"""

    def test_user_only_sees_workspace_events(self):
        """Users only see events from their workspaces"""
        pass

    def test_private_event_only_visible_to_participants(self):
        """Private events only visible to participants"""
        pass

    def test_public_event_visible_to_workspace_members(self):
        """Public events visible to all workspace members"""
        pass

    def test_workspace_owner_sees_all_events(self):
        """Workspace owners can see all workspace events"""
        pass

    def test_only_creator_can_edit_event(self):
        """Only event creator can edit"""
        pass

    def test_creator_can_share_private_event(self):
        """Event creator can add participants"""
        pass
```

---

### Phase 8: Data Migration & Deployment (Day 4, 2 hours)

#### Production Deployment Checklist

```bash
# 1. Backup database
pg_dump "postgresql://..." > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations in order
python manage.py migrate workspaces 000X_update_workspace_model
python manage.py migrate workspaces 000X_simplify_workspacemember_role
python manage.py migrate workspaces 000X_populate_workspace_members
python manage.py migrate profiles 000X_make_user_unique
python manage.py migrate profiles 000X_create_default_profiles
python manage.py migrate events 000X_update_events_model
python manage.py migrate events 000X_make_existing_events_public
python manage.py migrate events 000X_create_eventparticipant
python manage.py migrate workspaces 000X_create_auditlog
python manage.py migrate workspaces 000X_drop_deprecated_tables

# 3. Verify data integrity
python manage.py shell
>>> from workspaces.models import WorkspaceMember
>>> WorkspaceMember.objects.filter(is_active=True).count()
>>> from events.models import Event
>>> Event.objects.filter(is_private=False).count()

# 4. Update settings.py
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",  # Change from AllowAny
    ],
}

# 5. Restart services
# Restart Django server
# Clear Redis cache if using
# Restart Celery if using
```

---

## 🧪 Test Coverage Requirements

### Critical Test Cases (Must Pass Before Production)

1. ✅ Workspace owner can add members
2. ✅ Workspace owner can remove members
3. ✅ Member cannot add other members
4. ✅ Member cannot remove other members
5. ✅ User only sees events from their workspaces
6. ✅ Private events only visible to participants
7. ✅ Public events visible to all workspace members
8. ✅ Workspace owner can see all workspace events (even private)
9. ✅ Event creator can share private events with workspace members
10. ✅ Non-participants cannot see private events
11. ✅ User can only edit/delete own events
12. ✅ Workspace owner can delete any event in workspace
13. ✅ Cannot access events from non-member workspaces (403)
14. ✅ Cannot add user to workspace they're already member of
15. ✅ Profile only visible if shared workspace exists
16. ✅ Owner cannot be removed (must transfer first)
17. ✅ Soft-deleted workspaces not visible in list
18. ✅ Event participation status can be updated (accept/decline)
19. ✅ Audit log records all workspace actions
20. ✅ Default profiles created for users without profiles

---

## 📊 Success Metrics

### Technical Requirements
- ✅ All 20 critical tests passing
- ✅ No N+1 queries (use select_related/prefetch_related)
- ✅ API response time < 200ms for list endpoints
- ✅ Database queries optimized with proper indexes
- ✅ All endpoints require authentication
- ✅ Permission checks on all write operations

### Functional Requirements
- ✅ Users can create workspaces
- ✅ Owners can add/remove members
- ✅ Events properly filtered by workspace membership
- ✅ Private events work as expected with sharing
- ✅ Profiles visible only within shared workspaces
- ✅ Audit log captures all actions

### Security Requirements
- ✅ No data leakage across workspaces
- ✅ User ID from request.user, not query params
- ✅ Cannot access other workspaces' data (403)
- ✅ Cannot edit/delete others' content without permission
- ✅ Workspace owners have appropriate override permissions

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Full backup, test on database copy first |
| Breaking existing frontend | HIGH | MEDIUM | Feature flags, gradual rollout, keep existing events public |
| Performance degradation | MEDIUM | LOW | Add indexes, optimize queries, monitor query count |
| User confusion | MEDIUM | MEDIUM | Clear error messages, documentation, gradual feature introduction |
| Missing edge cases | MEDIUM | MEDIUM | Comprehensive test suite (20 tests), manual testing scenarios |
| Deployment downtime | LOW | LOW | Migrations are backward compatible, can run without downtime |

---

## 📅 Detailed Timeline

### Day 1 (7 hours)
- **Morning (4h):** Database schema updates
  - Create all 10 migrations
  - Test migrations on database copy
  - Apply migrations to database
  - Verify data integrity

- **Afternoon (3h):** Core authorization backend
  - Create permission utilities (permissions.py)
  - Create DRF permission classes (rest_permissions.py)
  - Create audit logging utility (audit.py)

### Day 2 (9 hours)
- **Morning (3h):** Finish authorization backend
  - Write tests for permission utilities
  - Test permission classes

- **Afternoon (6h):** Workspace management API
  - Update models
  - Create serializers
  - Create views (7 views)
  - Update URLs
  - Test workspace endpoints

### Day 3 (10 hours)
- **Morning (6h):** Event authorization
  - Update event models
  - Create event serializers
  - Create event views (5 views)
  - Update URLs
  - Test event endpoints

- **Afternoon (2h):** Profile authorization
  - Update profile views
  - Test profile endpoints

- **Evening (2h):** Start frontend
  - Update API client (add new functions)
  - Remove hardcoded user IDs

### Day 4 (12 hours)
- **Morning (6h):** Finish frontend
  - Create workspace selector component
  - Create member management component
  - Update event modals
  - Test UI flows

- **Afternoon (4h):** Testing
  - Run backend test suite (20 tests)
  - Manual testing scenarios
  - Fix any bugs found

- **Evening (2h):** Deploy
  - Backup database
  - Run migrations on production
  - Update settings
  - Restart services
  - Smoke test production

**Total: 38 hours over 6-7 working days (assuming 6 hours focused work per day)**

---

## 🎯 Post-Implementation Checklist

### Immediate (Week 1)
- [ ] Monitor error logs for authorization failures
- [ ] Check API performance metrics
- [ ] Gather user feedback on new features
- [ ] Fix any critical bugs

### Short-term (Month 1)
- [ ] Add rate limiting to prevent abuse
- [ ] Implement email notifications for member additions
- [ ] Add workspace activity feed
- [ ] Implement soft delete for events (trash/restore)
- [ ] Add pagination for large lists

### Long-term (Quarter 1)
- [ ] Recurring events
- [ ] Event templates
- [ ] Workspace settings (timezone, calendar view)
- [ ] Public workspace directory
- [ ] Advanced roles (custom permissions system)
- [ ] SSO integration for enterprises
- [ ] Mobile app support with same authorization

---

## 📚 Documentation Requirements

### Technical Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema diagram
- [ ] Authorization flow diagrams
- [ ] Migration guide for existing data
- [ ] Troubleshooting guide

### User Documentation
- [ ] How to create workspaces
- [ ] How to add/remove members
- [ ] How to share private events
- [ ] Understanding roles (owner vs member)
- [ ] Privacy settings guide

---

## ✅ Final Approval Checklist

Before marking this plan as approved and beginning implementation:

- [ ] Database schema reviewed and approved
- [ ] Authorization rules clear and make sense
- [ ] All API endpoints documented
- [ ] Test coverage requirements understood
- [ ] Timeline is realistic and agreed upon
- [ ] Risks identified with mitigation plans
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team alignment on priorities
- [ ] Success metrics defined and measurable

---

**Plan Status:** ✅ READY FOR IMPLEMENTATION
**Next Step:** Obtain approval and begin Phase 1 (Database Schema Updates)

**Estimated Completion:** 6-7 working days from start date
**Confidence Level:** HIGH (bulletproof plan with comprehensive testing)