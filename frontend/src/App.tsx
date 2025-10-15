import { useEffect, useMemo, useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { CalendarWeek } from "./components/calendar/CalendarWeek";
import { Agenda } from "./components/calendar/Agenda";
import { AddToCalendar } from "./components/calendar/AddToCalendar";
import {
  SmartScheduleModal,
  type ScheduledMeeting,
} from "./components/modals/SmartScheduleModal";
import {
  UnavailabilityModal,
  type BlockedTime,
} from "./components/modals/UnavailabilityModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Settings } from "./components/settings/Settings";
import { fetchEvents, type BackendEvent } from "./lib/api";
import { parseISO as parseISOBase, addWeeks, isSameWeek, startOfWeek } from "date-fns";

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

  // Backend events state
  const [backendEvents, setBackendEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from backend
  useEffect(() => {
    const loadBackendEvents = async () => {
      try {
        setLoading(true);
        const events = await fetchEvents();
        setBackendEvents(events);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBackendEvents();
  }, []);

  // Function to refresh events from backend
  const refreshEvents = async () => {
    try {
      const events = await fetchEvents();
      setBackendEvents(events);
    } catch (error) {
      console.error("Failed to refresh events:", error);
    }
  };

  // Derived events for the visible week
  const events: CalEvent[] = useMemo(() => {
    return backendEvents
      .map((e) => ({
        id: e.event_id,
        title: e.title,
        start: parseISOBase(e.start_time),
        end: parseISOBase(e.end_time),
        kind:
          (e.event_type === "GROUP"
            ? "unavailable"
            : "meeting") as "meeting" | "unavailable",
      }))
      .filter((e) => isSameWeek(e.start, weekStart, { weekStartsOn: 0 }));
  }, [backendEvents, weekStart]);

  // Week navigation
  const prevWeek = () => setWeekStart((d) => addWeeks(d, -1));
  const nextWeek = () => setWeekStart((d) => addWeeks(d, 1));
  const today = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Add flows
  const [showAdd, setShowAdd] = useState(false);
  const [showSmart, setShowSmart] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  function handleAddMeeting(m: ScheduledMeeting) {
    console.log("Meeting scheduled:", m);
    refreshEvents();
  }

  function handleBlocked(b: BlockedTime) {
    console.log("Time blocked:", b);
    refreshEvents();
  }

  // Delete flow
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const requestDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    console.log("Delete event:", pendingDeleteId);
    setPendingDeleteId(null);
  };

  // Leave workspace logic
  const handleLeaveWorkspace = (id: string) => {
    alert(`You have left workspace: ${id}`);
    setWorkspace("");
    setCurrent("dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* TopBar */}
      <TopBar workspaceName={workspace} onWorkspace={setWorkspace} />

      <div className="w-full h-full flex px-6 py-4 gap-6">
        {/* Sidebar */}
        <aside className="w-[260px] shrink-0 sticky top-14 self-start">
          <Sidebar current={current} setCurrent={(k) => setCurrent(k as CalRoute)} />
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full min-h-[calc(100vh-3.5rem)] overflow-auto">
          {current === "calendar" ? (
            <>
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

              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading events...</div>
              ) : (
                <CalendarWeek
                  weekStart={weekStart}
                  events={events}
                  onEventClick={requestDelete}
                />
              )}
            </>
          ) : current === "dashboard" ? (
            <Dashboard workspaceId={workspace} />
          ) : current === "settings" ? (
            <Settings workspaceId={workspace} onLeaveWorkspace={handleLeaveWorkspace} />
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-zinc-500 dark:border-zinc-800">
              {current.toUpperCase()} section
            </div>
          )}
        </main>

        {/* Agenda only for Calendar */}
        {current === "calendar" ? (
          <Agenda events={events} onDelete={requestDelete} />
        ) : null}
      </div>

      {/* Add / Smart Schedule / Block Modals */}
      <AddToCalendar
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSmartSchedule={() => setShowSmart(true)}
        onBlockTime={() => setShowBlock(true)}
      />

      <SmartScheduleModal
        open={showSmart}
        onClose={() => setShowSmart(false)}
        onScheduled={handleAddMeeting}
      />

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
        This will remove the event from your personal calendar. This action can’t be undone.
      </ConfirmModal>
    </div>
  );
}