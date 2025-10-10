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