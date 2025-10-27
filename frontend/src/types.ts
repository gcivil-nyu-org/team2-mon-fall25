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
  assignedTo?: string; // User initials or name
};