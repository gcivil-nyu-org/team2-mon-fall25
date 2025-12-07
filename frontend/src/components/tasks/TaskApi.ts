import { type Task } from "../../types";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper to get workspace ID
const getWorkspaceId = (): string | null => {
  // Check for workspace ID in localStorage with the key your app uses
  return localStorage.getItem("workspace_id") || localStorage.getItem("cd.workspace");
};

// Helper to build headers with auth and workspace context
const buildHeaders = (token?: string | null): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const workspaceId = getWorkspaceId();
  if (workspaceId) {
    headers["X-Workspace-ID"] = workspaceId;
  }

  return headers;
};

// map backend numeric priority → frontend string
const mapPriority = (priority: number): "high" | "medium" | "low" => {
  switch (priority) {
    case 1:
      return "high";
    case 2:
      return "medium";
    case 3:
      return "low";
    default:
      return "low";
  }
};

// map frontend string priority → backend numeric
const mapPriorityToNumber = (priority: "high" | "medium" | "low"): number => {
  switch (priority) {
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
  }
};

interface BackendTask {
  id: number;
  title?: string;
  description?: string;
  due_date?: string | null;
  priority: number;
  tags?: string[];
  status?: string;
  assignee?: number | null;
  assignee_email?: string | null;
  assignee_full_name?: string | null;
  assignee_username?: string | null;
  created_by?: number;
  created_by_email?: string;
  created_by_username?: string;
  workspace?: string;
  workspace_name?: string;
  dependencies?: number[];
  dependency_details?: Array<{
    id: number;
    title: string;
    status: string;
    priority: number;
  }>;
  can_complete?: boolean;
}
interface WorkspaceMember {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
}

interface AvailableTask {
  id: number;
  title: string;
  status: string;
  priority: number;
}

// ✅ Fetch all tasks
export const getTasks = async (token?: string | null): Promise<Task[]> => {
  const res = await fetch(`${API_URL}/api/tasks/`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();

  // Convert backend → frontend structure
  return data.map((t: BackendTask) => ({
    id: String(t.id),
    name: t.title || "",
    description: t.description || "",
    dueDate: t.due_date || "",
    priority: mapPriority(t.priority),
    tags: Array.isArray(t.tags) ? t.tags : [],
    status: (t.status || "todo").toLowerCase() as "todo" | "in-progress" | "done",
    assignedTo: t.assignee_full_name || t.assignee_username || t.assignee_email || "",
    assignedToId: t.assignee || undefined,
    createdBy: t.created_by_username || t.created_by_email || "",
    createdById: t.created_by,
    workspaceName: t.workspace_name,
    dependencies: t.dependency_details?.map(dep => ({
      id: String(dep.id),
      title: dep.title,
      status: dep.status as "todo" | "in-progress" | "done",
      priority: mapPriority(dep.priority),
    })) || [],
    canComplete: t.can_complete ?? true,
  }));
};

// ✅ Create new task
export const createTask = async (task: Task, token?: string | null): Promise<Task> => {
  const payload: {
    title: string;
    description: string;
    due_date: string | null;
    priority: number;
    tags: string[];
    status: string;
    assignee?: number;
    dependencies?: number[];
  } = {
    title: task.name,
    description: task.description,
    due_date: task.dueDate || null,
    priority: mapPriorityToNumber(task.priority),
    tags: task.tags || [],
    status: task.status,
  };

  // Include dependencies if provided
  if (task.dependencyIds && task.dependencyIds.length > 0) {
    payload.dependencies = task.dependencyIds.map(id => parseInt(id));
  }

  // Only include assignee if assignedToId is provided
  if (task.assignedToId) {
    payload.assignee = task.assignedToId;
  }

  const res = await fetch(`${API_URL}/api/tasks/`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to create task");
  }
  const created = await res.json();

  // Convert backend response → frontend structure
  return {
    id: String(created.id),
    name: created.title,
    description: created.description,
    dueDate: created.due_date,
    priority: mapPriority(created.priority),
    tags: created.tags || [],
    status: (created.status || "todo").toLowerCase() as "todo" | "in-progress" | "done",
    assignedTo: created.assignee_full_name || created.assignee_username || created.assignee_email || "",
    assignedToId: created.assignee || undefined,
    createdBy: created.created_by_username || created.created_by_email || "",
    createdById: created.created_by,
    workspaceName: created.workspace_name,
    dependencies: created.dependency_details?.map((dep: any) => ({
      id: String(dep.id),
      title: dep.title,
      status: dep.status as "todo" | "in-progress" | "done",
      priority: mapPriority(dep.priority),
    })) || [],
    canComplete: created.can_complete ?? true,
  };
};

// ✅ Update task
export const updateTask = async (
  id: string,
  updates: Partial<Task>,
  token?: string | null
): Promise<Task> => {
  const payload: Partial<{
    title: string;
    description: string;
    due_date: string | null;
    priority: number;
    tags: string[];
    status: string;
    dependencies: number[];
    assignee: number | null;
  }> = {};

  if (updates.name !== undefined) payload.title = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
  if (updates.priority) payload.priority = mapPriorityToNumber(updates.priority);
  if (updates.tags) payload.tags = updates.tags;
  if (updates.status) payload.status = updates.status;
  if (updates.assignedToId !== undefined) payload.assignee = updates.assignedToId || null;
  if (updates.dependencyIds !== undefined) {
    payload.dependencies = updates.dependencyIds.map(id => parseInt(id));
  }

  const res = await fetch(`${API_URL}/api/tasks/${id}/`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
  const error = await res.json();
  console.error("❌ Backend error:", error);
  
  // Extract meaningful error message
  let errorMessage = "Failed to update task";
  
  if (error.dependencies && Array.isArray(error.dependencies)) {
    errorMessage = error.dependencies[0];
  } else if (error.status && Array.isArray(error.status)) {
    errorMessage = error.status[0];
  } else if (error.detail) {
    errorMessage = error.detail;
  } else if (error.non_field_errors && Array.isArray(error.non_field_errors)) {
    errorMessage = error.non_field_errors[0];
  }
  
  throw new Error(errorMessage);
}
  const updated = await res.json();

  return {
    id: String(updated.id),
    name: updated.title,
    description: updated.description,
    dueDate: updated.due_date,
    priority: mapPriority(updated.priority),
    tags: updated.tags || [],
    status: (updated.status || "todo").toLowerCase() as "todo" | "in-progress" | "done",
    assignedTo: updated.assignee_full_name || updated.assignee_username || updated.assignee_email || "",
    assignedToId: updated.assignee || undefined,
    createdBy: updated.created_by_username || updated.created_by_email || "",
    createdById: updated.created_by,
    workspaceName: updated.workspace_name,
    dependencies: updated.dependency_details?.map((dep: any) => ({
      id: String(dep.id),
      title: dep.title,
      status: dep.status as "todo" | "in-progress" | "done",
      priority: mapPriority(dep.priority),
    })) || [],
    canComplete: updated.can_complete ?? true,
  };
};

// ✅ Delete task
export const deleteTask = async (id: string | number, token?: string | null): Promise<void> => {
  const res = await fetch(`${API_URL}/api/tasks/${id}/`, {
    method: "DELETE",
    headers: buildHeaders(token),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to delete task");
  }
};
// ✅ Get workspace members for task assignment
export const getWorkspaceMembers = async (token?: string | null): Promise<WorkspaceMember[]> => {
  const res = await fetch(`${API_URL}/api/tasks/workspace-members/`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch workspace members");
  return res.json();
};

// ✅ Get available tasks for dependencies
export const getAvailableTasks = async (
  token?: string | null,
  excludeId?: string
): Promise<AvailableTask[]> => {
  const params = new URLSearchParams();
  if (excludeId) {
    params.append('exclude_id', excludeId);
  }

  const url = `${API_URL}/api/tasks/available-tasks/${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, {
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch available tasks");
  return res.json();
};









