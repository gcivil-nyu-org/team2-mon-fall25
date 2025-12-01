# Task Dependencies Feature Documentation

## Overview

This document describes the **Task Assignment** and **Task Dependencies** features implemented in the frontend. These are currently **mockup implementations** using local state and simulated data. Backend integration is required for full functionality.

---

## Features Implemented

### 1. Task Assignment
- **Single assignee per task**: Tasks can be assigned to one workspace member
- **Assignee dropdown**: Available workspace members fetched from backend
- **Visual indicator**: Avatar with initials displayed on task cards
- **Unassigned option**: Tasks can remain unassigned

### 2. Task Dependencies
- **Dependency selection**: Tasks can depend on completion of other tasks
- **Multiple dependencies**: A task can have multiple dependencies
- **Status tracking**: Dependencies show current status (todo/in-progress/done)
- **Blocking logic**: Tasks cannot be marked as "done" if dependencies are incomplete
- **Visual indicators**: Dependency badges show count and completion status

### 3. Quick Add Task
- **Inline creation**: Add tasks directly from board columns or list view
- **Keyboard shortcuts**: Enter to save, Escape to cancel
- **Auto-focus**: Input automatically focused when opened
- **Two variants**: Board (larger) and list (compact) styles

---

## User Interface

### Task Creation Modal

**Location**: Opened via "New Task" button in Tasks view

**New Fields**:
- **Assign To** dropdown: Select workspace member or leave unassigned
- **Dependencies** section: Search and select tasks that must be completed first

**Dependency Selector**:
- Search bar to filter available tasks
- Status indicators (○ todo, ⏳ in-progress, ✓ done)
- Color-coded status badges
- Remove button (×) for selected dependencies

### Task Board

**Quick Add Task**:
- Appears at bottom of each column (To Do, In Progress, Done)
- Compact input with "+ Add task" placeholder
- Opens full modal via "+ More details" link

**Task Cards**:
- **Assignee avatar**: Shows initials of assigned person
  - Hover for full name tooltip
  - Located in bottom-right corner
- **Dependency badge**: Shows "🔗 {count}" next to priority
  - Green background: All dependencies complete
  - Red background: Has incomplete dependencies
  - Hover shows dependency count tooltip

**Drag Validation**:
- Attempting to drag task with incomplete dependencies to "Done" shows modal
- Warning modal lists all incomplete dependencies
- Task remains in original status until dependencies are complete

### Blocked Task Modal

**Triggered when**: User tries to complete task with incomplete dependencies

**Contents**:
- Warning icon and message
- List of incomplete dependencies with:
  - Status icon (○ ⏳ ✓)
  - Task title
  - Current status badge
- "Got it" button to dismiss

---

## Technical Implementation

### Type Definitions

**File**: `frontend/src/types.ts`

```typescript
export type TaskDependency = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
};

export type Task = {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  tags: string[];
  status: "todo" | "in-progress" | "done";
  assignedToId?: number;           // NEW: User ID of assignee
  assignedTo?: string;              // NEW: Display name of assignee
  dependencies?: TaskDependency[];  // NEW: Tasks that must be completed first
  canComplete?: boolean;            // NEW: Whether task can be marked done
  incompleteDependencyCount?: number; // NEW: Count of incomplete dependencies
};
```

### Component Files

#### New Components

1. **`frontend/src/components/tasks/QuickAddTask.tsx`**
   - Inline task creation component
   - Variants: board (large) and list (compact)
   - Props: `onAdd`, `onOpenFullModal`, `status`, `placeholder`, `variant`

2. **`frontend/src/components/tasks/DependencySelector.tsx`**
   - Search and select dependencies
   - Shows available tasks with status
   - Filters out already selected and self-references
   - Props: `availableTasks`, `selectedDependencies`, `onAdd`, `onRemove`

3. **`frontend/src/components/modals/BlockedTaskModal.tsx`**
   - Warning modal for incomplete dependencies
   - Shows list of blocking tasks
   - Props: `task`, `incompleteDependencies`, `onClose`, `onViewDependencies?`

#### Modified Components

1. **`frontend/src/components/modals/TaskModal.tsx`**
   - Added workspace member fetching
   - Added assignee dropdown
   - Integrated DependencySelector
   - Updated task creation to include dependencies

2. **`frontend/src/components/tasks/TaskCard.tsx`**
   - Added assignee avatar with initials
   - Added dependency indicator badge
   - Color-coded by completion status

3. **`frontend/src/components/tasks/TaskBoard.tsx`**
   - Integrated QuickAddTask in columns
   - Added drag validation for dependencies
   - Shows BlockedTaskModal when needed

4. **`frontend/src/components/tasks/Tasks.tsx`**
   - Added `handleQuickAddTask` function
   - Passes `availableTasks` to TaskModal
   - Wired up callbacks for quick add

---

## Current Limitations (Mockup Implementation)

### What Works (Frontend Only)
✅ UI for selecting and displaying dependencies
✅ UI for assigning tasks to workspace members
✅ Visual indicators for dependency status
✅ Validation preventing completion of blocked tasks
✅ Quick add task functionality
✅ Dependency badges and avatars on task cards

### What Needs Backend Implementation
❌ Persistence of task dependencies
❌ Persistence of task assignments
❌ Real-time dependency status updates
❌ Circular dependency prevention (backend validation)
❌ Cascade deletion options
❌ Dependency change notifications

---

## Backend Requirements

### Database Schema

**New Model**: `TaskDependency`

```python
class TaskDependency(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='dependencies')
    depends_on = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='blocking_tasks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('task', 'depends_on')

    def clean(self):
        # Prevent self-dependency
        if self.task == self.depends_on:
            raise ValidationError("Task cannot depend on itself")

        # Prevent circular dependencies
        if self._creates_cycle():
            raise ValidationError("This would create a circular dependency")
```

**Update Model**: `Task`

```python
class Task(models.Model):
    # ... existing fields ...
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )

    @property
    def can_complete(self):
        """Check if all dependencies are completed"""
        return not self.dependencies.filter(
            depends_on__status__in=['todo', 'in-progress']
        ).exists()

    @property
    def incomplete_dependency_count(self):
        """Count incomplete dependencies"""
        return self.dependencies.filter(
            depends_on__status__in=['todo', 'in-progress']
        ).count()
```

### API Endpoints

#### Update Task Serializer

```python
class TaskDependencySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='depends_on.id')
    title = serializers.CharField(source='depends_on.name')
    status = serializers.CharField(source='depends_on.status')

    class Meta:
        model = TaskDependency
        fields = ['id', 'title', 'status']

class TaskSerializer(serializers.ModelSerializer):
    dependencies = TaskDependencySerializer(many=True, read_only=True)
    dependency_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name',
        read_only=True
    )
    can_complete = serializers.BooleanField(read_only=True)
    incomplete_dependency_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'name', 'description', 'due_date', 'priority',
            'tags', 'status', 'assigned_to', 'assigned_to_name',
            'dependencies', 'dependency_ids', 'can_complete',
            'incomplete_dependency_count'
        ]

    def create(self, validated_data):
        dependency_ids = validated_data.pop('dependency_ids', [])
        task = super().create(validated_data)

        # Create dependency relationships
        for dep_id in dependency_ids:
            TaskDependency.objects.create(
                task=task,
                depends_on_id=dep_id
            )

        return task

    def update(self, instance, validated_data):
        dependency_ids = validated_data.pop('dependency_ids', None)
        task = super().update(instance, validated_data)

        if dependency_ids is not None:
            # Clear existing dependencies
            task.dependencies.all().delete()

            # Create new dependencies
            for dep_id in dependency_ids:
                TaskDependency.objects.create(
                    task=task,
                    depends_on_id=dep_id
                )

        return task
```

#### Validation on Status Change

```python
# In views.py or serializers.py
def validate_status(self, value):
    if value == 'done':
        instance = self.instance
        if instance and not instance.can_complete:
            incomplete = instance.dependencies.filter(
                depends_on__status__in=['todo', 'in-progress']
            )
            raise serializers.ValidationError(
                f"Cannot complete task. {incomplete.count()} dependencies are incomplete."
            )
    return value
```

---

## Frontend API Integration Points

### Files to Update

**`frontend/src/components/tasks/TaskApi.ts`**

Current structure:
```typescript
export const getTasks = async (token: string): Promise<Task[]> => { ... }
export const createTask = async (task: Task, token: string) => { ... }
export const updateTask = async (id: string, updates: Partial<Task>, token: string) => { ... }
export const deleteTask = async (id: string | number, token: string) => { ... }
```

Update `createTask` to send dependencies:
```typescript
export const createTask = async (task: Task, token: string) => {
  const payload = {
    name: task.name,
    description: task.description,
    due_date: task.dueDate,
    priority: task.priority,
    tags: task.tags,
    status: task.status,
    assigned_to: task.assignedToId,
    dependency_ids: task.dependencies?.map(d => d.id) || []
  };
  // ... rest of implementation
};
```

Update `updateTask` to handle dependencies:
```typescript
export const updateTask = async (id: string, updates: Partial<Task>, token: string) => {
  const payload: any = {};
  if (updates.name) payload.name = updates.name;
  if (updates.status) payload.status = updates.status;
  if (updates.priority) payload.priority = updates.priority;
  if (updates.assignedToId !== undefined) payload.assigned_to = updates.assignedToId;
  if (updates.dependencies !== undefined) {
    payload.dependency_ids = updates.dependencies.map(d => d.id);
  }
  // ... rest of implementation
};
```

---

## Testing Guide

### Manual Testing Steps

1. **Test Task Assignment**
   - Create new task with assignee
   - Verify avatar appears on task card
   - Hover over avatar to see name tooltip
   - Update task to change assignee
   - Verify avatar updates

2. **Test Dependencies Selection**
   - Create task A
   - Create task B with task A as dependency
   - Verify dependency shows in task B's details
   - Verify dependency badge appears on card

3. **Test Quick Add**
   - Click "+ Add task" in any column
   - Type task name and press Enter
   - Verify task appears in correct column
   - Press Escape to cancel
   - Click "+ More details" to open full modal

4. **Test Blocking Logic**
   - Create task with dependency
   - Try to drag to "Done" column
   - Verify BlockedTaskModal appears
   - Complete dependency task
   - Verify can now mark as done

5. **Test Dependency Indicators**
   - Create task with multiple dependencies
   - Verify badge shows correct count
   - Complete some dependencies
   - Verify badge color changes when all complete

### Edge Cases to Test

- Circular dependency prevention (backend)
- Self-dependency prevention (backend)
- Deleting task with dependents (backend)
- Multiple users editing same task (backend)
- Task with many dependencies (UI scalability)

---

## Design System Consistency

### Colors Used

**Dependency Indicators**:
- Green (`bg-green-100`, `text-green-700`): All dependencies complete
- Red (`bg-red-100`, `text-red-700`): Has incomplete dependencies

**Status Badges**:
- Green: Done
- Blue: In Progress
- Zinc/Gray: To Do

**Avatars**:
- Blue (`bg-blue-100`, `text-blue-700`): Assignee avatar

### Typography
- Task names: `font-medium`
- Labels: `text-sm font-medium`
- Helper text: `text-xs`

### Spacing
- Card padding: `p-4`
- Badge spacing: `px-2 py-0.5`
- Modal spacing: `px-6 py-4` (header), `px-6 py-5` (body)

### Dark Mode
All components support dark mode with `dark:` variants following existing patterns.

---

## Future Enhancements

### Potential Features
1. **Bulk dependency management**: Add/remove multiple dependencies at once
2. **Dependency graph visualization**: Visual diagram of task relationships
3. **Dependency templates**: Pre-defined dependency chains for common workflows
4. **Smart suggestions**: Recommend dependencies based on tags/names
5. **Dependency notifications**: Alert assignees when blocking tasks complete
6. **Cascade options**: Choose behavior when deleting task with dependents
7. **Multiple assignees**: Support for tasks assigned to multiple people
8. **Assignee workload view**: See all tasks per person

### Performance Optimizations
- Lazy load dependency status for large task lists
- Cache dependency calculations
- Optimize re-renders when dependencies change
- Virtual scrolling for long dependency lists

---

## Summary

This implementation provides a complete **frontend mockup** of task assignment and dependencies features. The UI is fully functional and follows the existing design system. Backend integration is required to:

1. Persist task assignments and dependencies
2. Validate circular dependencies
3. Provide real-time updates
4. Handle cascade deletion
5. Support notifications and advanced features

The architecture is designed to make backend integration straightforward - most logic is already structured to work with API responses following the documented schema.
