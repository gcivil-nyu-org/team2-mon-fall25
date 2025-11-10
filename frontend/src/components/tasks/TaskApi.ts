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
  assignee_username?: string | null;
  created_by?: number;
  created_by_email?: string;
  created_by_username?: string;
  workspace?: string;
  workspace_name?: string;
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
    assignedTo: t.assignee_username || t.assignee_email || "",
    assignedToId: t.assignee || undefined,
    createdBy: t.created_by_username || t.created_by_email || "",
    createdById: t.created_by,
    workspaceName: t.workspace_name,
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
  } = {
    title: task.name,
    description: task.description,
    due_date: task.dueDate || null,
    priority: mapPriorityToNumber(task.priority),
    tags: task.tags || [],
    status: task.status,
  };

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
    assignedTo: created.assignee_username || created.assignee_email || "",
    assignedToId: created.assignee || undefined,
    createdBy: created.created_by_username || created.created_by_email || "",
    createdById: created.created_by,
    workspaceName: created.workspace_name,
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
    assignee: number | null;
  }> = {};

  if (updates.name !== undefined) payload.title = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
  if (updates.priority) payload.priority = mapPriorityToNumber(updates.priority);
  if (updates.tags) payload.tags = updates.tags;
  if (updates.status) payload.status = updates.status;
  if (updates.assignedToId !== undefined) payload.assignee = updates.assignedToId || null;

  const res = await fetch(`${API_URL}/api/tasks/${id}/`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to update task");
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
    assignedTo: updated.assignee_username || updated.assignee_email || "",
    assignedToId: updated.assignee || undefined,
    createdBy: updated.created_by_username || updated.created_by_email || "",
    createdById: updated.created_by,
    workspaceName: updated.workspace_name,
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









