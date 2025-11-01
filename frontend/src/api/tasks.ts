import { type Task } from "../types";

const API_URL = "http://localhost:8000/api/tasks/"; // replace with your backend URL

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

// ✅ Fetch all tasks
export const getTasks = async (): Promise<Task[]> => {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();

  // Convert backend → frontend structure
  return data.map((t: any) => ({
    id: String(t.id),
    name: t.title || "",
    description: t.description || "",
    dueDate: t.due_date || "",
    priority: mapPriority(t.priority),
    tags: Array.isArray(t.tags) ? t.tags : [],
    status: (t.status || "todo").toLowerCase() as "todo" | "in-progress" | "done",
    assignedTo: t.assignee || "",
  }));
};

// ✅ Create new task
export const createTask = async (task: Task): Promise<Task> => {
  const payload = {
    title: task.name,
    description: task.description,
    due_date: task.dueDate || null,
    priority: mapPriorityToNumber(task.priority),
    tags: task.tags || [],
    status: task.status.toUpperCase(),
    assignee: task.assignedTo || "",
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to create task");
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
    assignedTo: created.assignee || "",
  };
};

// ✅ Update task
export const updateTask = async (
  id: string,
  updates: Partial<Task>
): Promise<Task> => {
  const payload: any = {};
  if (updates.name) payload.title = updates.name;
  if (updates.description) payload.description = updates.description;
  if (updates.dueDate) payload.due_date = updates.dueDate;
  if (updates.priority) payload.priority = mapPriorityToNumber(updates.priority);
  if (updates.tags) payload.tags = updates.tags;
  if (updates.status) payload.status = updates.status.toUpperCase();
  if (updates.assignedTo) payload.assignee = updates.assignedTo;

  const res = await fetch(`${API_URL}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to update task");
  const updated = await res.json();

  return {
    id: String(updated.id),
    name: updated.title,
    description: updated.description,
    dueDate: updated.due_date,
    priority: mapPriority(updated.priority),
    tags: updated.tags || [],
    status: (updated.status || "todo").toLowerCase() as "todo" | "in-progress" | "done",
    assignedTo: updated.assignee || "",
  };
};

// ✅ Delete task
export const deleteTask = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
};
