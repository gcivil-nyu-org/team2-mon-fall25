export type Workspace = { id: string; name: string };

export type NavKey =
  | "dashboard"
  | "notes"
  | "tasks"
  | "calendar"
  | "resources"
  | "message"
  | "chat"
  | "settings";

export type CalendarEvent = {
  id: string;
  title: string;
  day: number;
  startHour: number;
  endHour: number;
};

export type Task = {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  tags: string[];
  status: "todo" | "in-progress" | "done";
  assignedTo?: string; // User email or username (for display)
  assignedToId?: number; // User ID for API calls
  createdBy?: string; // Creator email or username (for display)
  createdById?: number; // Creator user ID
  workspaceName?: string; // Workspace name for display
};