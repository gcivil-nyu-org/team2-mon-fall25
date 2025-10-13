import { useEffect, useMemo, useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { CalendarWeek } from "./components/calendar/CalendarWeek";
import { Agenda } from "./components/calendar/Agenda";
import { AddToCalendar } from "./components/calendar/AddToCalendar";
import { SmartScheduleModal, type ScheduledMeeting } from "./components/modals/SmartScheduleModal";
import { UnavailabilityModal, type BlockedTime } from "./components/calendar/UnavailabilityModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { Dashboard } from "./components/dashboard/Dashboard";

import {
  addDays,
  addWeeks,
  isSameWeek,
  parseISO,
  set,
  startOfWeek,
} from "date-fns";

type CalRoute =
  | "dashboard"
  | "notes"
  | "tasks"
  | "calendar"
  | "resources"
  | "message"
  | "chat"
  | "settings";

type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: "meeting" | "unavailable";
};

// ---- LocalStorage (per workspace) ----
type StoredEvent = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  kind?: "meeting" | "unavailable";
};
const KEY = (ws: string) => `cd.events.${ws}`;

function loadEvents(workspace: string): StoredEvent[] {
  try {
    const raw = localStorage.getItem(KEY(workspace));
    return raw ? (JSON.parse(raw) as StoredEvent[]) : [];
  } catch {
    return [];
  }
}
function saveEvents(workspace: string, events: StoredEvent[]) {
  localStorage.setItem(KEY(workspace), JSON.stringify(events));
}

export default function App() {
  // Route + workspace
  const [current, setCurrent] = useState<CalRoute>("calendar");
  const [workspace, setWorkspace] = useState<string>(() => {
    return localStorage.getItem("cd.workspace") || "";
  });
  useEffect(() => localStorage.setItem("cd.workspace", workspace), [workspace]);

  // Calendar state: week start (Sun)
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  // Seed defaults if empty
  useEffect(() => {
    const existing = loadEvents(workspace);
    if (existing.length === 0) {
      const base = startOfWeek(new Date(), { weekStartsOn: 0 });
      const defaults: StoredEvent[] = [
        {
          id: crypto.randomUUID(),
          title: "Sprint Planning",
          startISO: set(addDays(base, 1), { hours: 9, minutes: 0 }).toISOString(), // Mon 09:00
          endISO: set(addDays(base, 1), { hours: 12, minutes: 0 }).toISOString(), // Mon 12:00
          kind: "meeting",
        },
        {
          id: crypto.randomUUID(),
          title: "Vacation",
          startISO: set(addDays(base, 6), { hours: 10, minutes: 0 }).toISOString(), // Sat 10:00
          endISO: set(addDays(base, 6), { hours: 18, minutes: 0 }).toISOString(),  // Sat 18:00
          kind: "unavailable",
        },
      ];
      saveEvents(workspace, defaults);
    }
  }, [workspace]);

  // Derived events for the visible week
  const events: CalEvent[] = useMemo(() => {
    const stored = loadEvents(workspace);
    return stored
      .map((e) => ({
        id: e.id,
        title: e.title,
        start: parseISO(e.startISO),
        end: parseISO(e.endISO),
        kind: e.kind ?? "meeting",
      }))
      .filter((e) => isSameWeek(e.start, weekStart, { weekStartsOn: 0 }));
  }, [workspace, weekStart]);

  // Week navigation
  const prevWeek = () => setWeekStart((d) => addWeeks(d, -1));
  const nextWeek = () => setWeekStart((d) => addWeeks(d, 1));
  const today = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Add flows
  const [showAdd, setShowAdd] = useState(false);
  const [showSmart, setShowSmart] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  function handleAddMeeting(m: ScheduledMeeting) {
    const all = loadEvents(workspace);
    all.push({
      id: m.id,
      title: m.title,
      startISO: m.startISO,
      endISO: m.endISO,
      kind: "meeting",
    });
    saveEvents(workspace, all);
    setWeekStart((d) => new Date(d)); // refresh derived events
  }

  function handleBlocked(b: BlockedTime) {
    const all = loadEvents(workspace);
    all.push({
      id: b.id,
      title: b.title,
      startISO: b.startISO,
      endISO: b.endISO,
      kind: "unavailable",
    });
    saveEvents(workspace, all);
    setWeekStart((d) => new Date(d));
  }

  // Delete flow (from grid or agenda)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const requestDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const remaining = loadEvents(workspace).filter((e) => e.id !== pendingDeleteId);
    saveEvents(workspace, remaining);
    setPendingDeleteId(null);
    setWeekStart((d) => new Date(d));
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Global top bar (workspace switcher lives here) */}
      <TopBar workspaceName={workspace} onWorkspace={setWorkspace} />

      <div className="w-full h-full flex px-6 py-4 gap-6">
        {/* Global sidebar */}
        <aside className="w-[260px] shrink-0 sticky top-14 self-start">
          <Sidebar current={current} setCurrent={(k) => setCurrent(k as CalRoute)} />
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full min-h-[calc(100vh-3.5rem)] overflow-auto">
          {current === "calendar" ? (
            <>
              {/* Calendar-only header */}
              <header className="mb-3 flex items-center gap-2">
                <h1 className="text-2xl font-semibold mr-3">Calendar</h1>
                <button
                  onClick={prevWeek}
                  className="rounded-md border px-2 py-1 text-sm dark:border-zinc-700"
                >
                  ‹
                </button>
                <button
                  onClick={today}
                  className="rounded-md border px-2 py-1 text-sm dark:border-zinc-700"
                >
                  Today
                </button>
                <button
                  onClick={nextWeek}
                  className="rounded-md border px-2 py-1 text-sm dark:border-zinc-700"
                >
                  ›
                </button>
                <div className="ml-auto" />
                <button
                  onClick={() => setShowAdd(true)}
                  className="rounded-md border px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  + Add
                </button>
              </header>

              {/* Week grid (click an event to delete) */}
              <CalendarWeek
                weekStart={weekStart}
                events={events}
                onEventClick={requestDelete}
              />
            </>
          ) : current === "dashboard" ? (
            <Dashboard workspaceId={workspace}/>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-zinc-500 dark:border-zinc-800">
              {current.toUpperCase()} section
            </div>
          )}
        </main>

        {/* Agenda only on Calendar */}
        {current === "calendar" ? (
          <Agenda events={events} onDelete={requestDelete} />
        ) : null}
      </div>

      {/* Add to Calendar (chooser) */}
      <AddToCalendar
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSmartSchedule={() => setShowSmart(true)}
        onBlockTime={() => setShowBlock(true)}
      />

      {/* Smart Schedule flow */}
      <SmartScheduleModal
        open={showSmart}
        onClose={() => setShowSmart(false)}
        onScheduled={handleAddMeeting}
      />

      {/* Schedule Unavailability flow */}
      <UnavailabilityModal
        open={showBlock}
        onClose={() => setShowBlock(false)}
        onBlocked={handleBlocked}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title="Delete Event?"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
      >
        This will remove the event from your personal calendar. This action can’t be
        undone.
      </ConfirmModal>
    </div>
  );
}