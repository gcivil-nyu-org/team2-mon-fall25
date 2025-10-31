import { useAuth0 } from "@auth0/auth0-react";
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
import { fetchEvents, setTokenGetter, deleteEvent, type BackendEvent } from "./lib/api";
import { parseISO as parseISOBase, addWeeks, isSameWeek, startOfWeek } from "date-fns";
import Tasks from "./components/tasks/Tasks";
import { LandingPage } from "./components/landing/LandingPage";

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
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);

  // Set up token getter for API calls
  useEffect(() => {
    console.log("App: Setting up token getter. isAuthenticated:", isAuthenticated);
    setTokenGetter(async () => {
      if (!isAuthenticated) {
        console.log("Token getter called but user not authenticated");
        return null;
      }
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        console.log("Token getter: Successfully retrieved token");
        return token;
      } catch (error) {
        console.error("Failed to get access token:", error);
        return null;
      }
    });
    setTokenReady(true);
  }, [isAuthenticated, getAccessTokenSilently]);

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

  // Fetch events from backend - only when authenticated
  useEffect(() => {
    if (isLoading) return; // Wait for Auth0 to finish checking
    if (!isAuthenticated) {
      setLoading(false);
      return; // Don't fetch if not authenticated
    }
  if (!tokenReady) {
        return; // Wait for token getter to be set up
      }
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
  }, [isAuthenticated, isLoading, tokenReady]);

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
  const [isDeleting, setIsDeleting] = useState(false);
  const requestDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = async () => {
    if (!pendingDeleteId || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteEvent(pendingDeleteId);
      console.log("Event deleted successfully:", pendingDeleteId);
      await refreshEvents(); // Refresh the events list
      setPendingDeleteId(null);
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Leave workspace logic
  const handleLeaveWorkspace = (id: string) => {
    alert(`You have left workspace: ${id}`);
    setWorkspace("");
    setCurrent("dashboard");
  };

  // Show loading screen while Auth0 initializes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-center">
          <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show main app if authenticated
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
          ) : current === "tasks" ? (
            <Tasks />
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
        onClose={() => !isDeleting && setPendingDeleteId(null)}
        title="Delete Event?"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      >
        This will remove the event from your personal calendar. This action can't be undone.
      </ConfirmModal>
    </div>
  );
}
