import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState, useRef } from "react";
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
import { EventDetailsModal } from "./components/modals/EventDetailsModal";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Settings } from "./components/settings/Settings";
import { fetchEvents, setTokenGetter, deleteEvent, fetchCurrentUser, createWorkspace, joinWorkspace, fetchAllUsers, fetchWorkspaceList, type BackendEvent, type User, type RSVPStatus } from "./lib/api";
import { parseISO as parseISOBase, addWeeks, isSameWeek, startOfWeek } from "date-fns";
import Tasks from "./components/tasks/Tasks";
import { Resources } from "./components/resources/Resources";
import { MessageBoard } from "./components/messageboard/MessageBoard";
import { LandingPage } from "./components/landing/LandingPage";
import { Modal } from "./components/modals/Modal";
import { WorkspaceActionModal } from "./components/modals/WorkspaceActionModal";
import { JoinWorkspaceModal } from "./components/modals/JoinWorkspaceModal";
import { Notes } from "./components/notes/Notes";
import { Chat } from "./components/chat/Chat";
import { Toaster, toast } from "sonner";

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
  description?: string;
  location?: string;
  createdBy?: number;
  createdByName?: string;
  attendeesNames?: string[];
  userRsvpStatus?: RSVPStatus;
  rsvpSummary?: {
    accepted: number;
    declined: number;
    tentative: number;
    pending: number;
  };
  attendeesWithRsvp?: Array<{
    name: string;
    status: RSVPStatus;
  }>;
};

export default function App() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, logout } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);

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

        logout({
          logoutParams: {
            returnTo: window.location.origin
          }
        });

        return null;
      }
    })/*  */;
    setTokenReady(true);
  }, [isAuthenticated, getAccessTokenSilently, logout]);

  // Route + workspace
  const [current, setCurrent] = useState<CalRoute>("dashboard");
  const [workspace, setWorkspace] = useState<string>(() => {
    return localStorage.getItem("cd.workspace") || "";
  });
  useEffect(() => localStorage.setItem("cd.workspace", workspace), [workspace]);

  // Forced workspace selection for new users
  const [showForcedWorkspaceSelection, setShowForcedWorkspaceSelection] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userWorkspaces, setUserWorkspaces] = useState<{ workspace_id: string; name: string }[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);

  // Fetch user's workspaces
  useEffect(() => {
    if (!isAuthenticated || !tokenReady) return;

    const loadWorkspaces = async () => {
      try {
        const data = await fetchWorkspaceList();
        setUserWorkspaces(data);
        setWorkspacesLoaded(true);

        // If user has no workspaces, force workspace selection
        if (data.length === 0) {
          setWorkspace("");
          setShowForcedWorkspaceSelection(true);
          setShowActionModal(true);
        }
        // If user has workspaces but none selected, auto-select first one
        else if (!workspace || !data.some(w => w.workspace_id === workspace)) {
          setWorkspace(data[0].workspace_id);
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        setWorkspacesLoaded(true);
      }
    };

    loadWorkspaces();
  }, [isAuthenticated, tokenReady]);

  // Update forced selection state when workspace changes
  useEffect(() => {
    if (!workspacesLoaded) return;

    if (userWorkspaces.length === 0 || !workspace) {
      setShowForcedWorkspaceSelection(true);
    } else {
      setShowForcedWorkspaceSelection(false);
    }
  }, [workspace, userWorkspaces, workspacesLoaded]);

  // Fetch all users for member selection
  useEffect(() => {
    if (!isAuthenticated || !tokenReady) return;

    const loadUsers = async () => {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 1000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Fetching all users...`);
          const data = await fetchAllUsers();
          setUsers(data);
          return;
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt < MAX_RETRIES) {
            await new Promise((res) => setTimeout(res, RETRY_DELAY));
          }
        }
      }
    };

    loadUsers();
  }, [isAuthenticated, tokenReady]);

  // Scroll to top when route changes
  const mainContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  // Message board thread state
  const [openThreadMessageId, setOpenThreadMessageId] = useState<string | null>(null);

  // Handle opening a message thread from dashboard
  const handleOpenMessageThread = (messageId: string) => {
    setOpenThreadMessageId(messageId);
    setCurrent("message");
  };

  // Clear thread message ID when leaving message board
  useEffect(() => {
    if (current !== "message") {
      setOpenThreadMessageId(null);
    }
  }, [current]);

  // Current user and calendar view state
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [currentUserUUID, setCurrentUserUUID] = useState<string | undefined>();
  const [calendarView, setCalendarView] = useState<"my" | "all">("all");
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalEvent | null>(null);

  // Fetch current user ID
  useEffect(() => {
    if (!isAuthenticated || !tokenReady) return;

    const loadCurrentUser = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUserId(user.id);
        setCurrentUserUUID(user.user_id);
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };

    loadCurrentUser();
  }, [isAuthenticated, tokenReady]);

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
    if (!workspace) {
      setLoading(false);
      return; // Don't fetch if no workspace selected
    }
    const loadBackendEvents = async () => {
      try {
        setLoading(true);
        console.log("🔄 Fetching events for workspace:", workspace);
        const events = await fetchEvents();
        setBackendEvents(events);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBackendEvents();
  }, [isAuthenticated, isLoading, tokenReady, workspace]);

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
  const allEvents: CalEvent[] = useMemo(() => {
    return backendEvents.map((e) => ({
      id: e.event_id,
      title: e.title,
      start: parseISOBase(e.start_time),
      end: parseISOBase(e.end_time),
      kind:
        (e.event_type === "GROUP"
          ? "unavailable"
          : "meeting") as "meeting" | "unavailable",
      description: e.description,
      location: e.location,
      createdBy: e.created_by,
      createdByName: e.created_by_name,
      attendeesNames: (e.attendees_detail || []).map((p) => p.full_name).filter(Boolean),
      userRsvpStatus: e.userRsvpStatus,
      rsvpSummary: e.rsvpSummary,
      attendeesWithRsvp: e.attendeesWithRsvp,
    }));
  }, [backendEvents]);

  // Filter events based on view mode and week
  const events: CalEvent[] = useMemo(() => {
    let filtered = allEvents;

    // Filter by view mode
    if (calendarView === "my" && currentUserId !== undefined) {
      filtered = filtered.filter((e) => e.createdBy === currentUserId);
    }

    // Filter by visible week
    filtered = filtered.filter((e) => isSameWeek(e.start, weekStart, { weekStartsOn: 0 }));

    return filtered;
  }, [allEvents, calendarView, currentUserId, weekStart]);

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

  // Event details and delete flow
  const handleEventClick = (id: string) => {
    const event = allEvents.find((e) => e.id === id);
    if (event) {
      setSelectedEventForDetails(event);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
      console.log("Event deleted successfully:", id);
      await refreshEvents();
      setSelectedEventForDetails(null);
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event. Please try again.");
    }
  };

  // Handle event updates from modal (e.g. RSVP changes)
  const handleEventUpdate = (updatedEvent: CalEvent) => {
    setBackendEvents((prev) =>
      prev.map((e) => {
        if (e.event_id === updatedEvent.id) {
          return {
            ...e,
            userRsvpStatus: updatedEvent.userRsvpStatus,
            rsvpSummary: updatedEvent.rsvpSummary,
            attendeesWithRsvp: updatedEvent.attendeesWithRsvp,
            // Update other fields if needed
          };
        }
        return e;
      })
    );
  };

  // Leave workspace logic
  const handleLeaveWorkspace = (id: string) => {
    toast.success(`You have left workspace: ${id}`);
    setWorkspace("");
    setCurrent("dashboard");
  };

  // Create workspace handler
  const handleCreateWorkspace = async () => {
    try {
      const payload = {
        name: wsName,
        description: wsDesc,
        members: [],
      };
      const newWorkspace = await createWorkspace(payload);
      console.log("Workspace created:", newWorkspace);

      // Refresh workspace list
      const updatedWorkspaces = await fetchWorkspaceList();
      setUserWorkspaces(updatedWorkspaces);

      setShowCreate(false);
      setShowActionModal(false);
      setWorkspace(newWorkspace.workspace_id);
      setWsName("");
      setWsDesc("");
      setSelected([]);
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace. Please try again.");
    }
  };

  // Join workspace handler
  const handleJoinWorkspace = async (code: string) => {
    try {
      const joinedWorkspace = await joinWorkspace(code);
      console.log("Joined workspace:", joinedWorkspace);

      // Refresh workspace list
      const updatedWorkspaces = await fetchWorkspaceList();
      setUserWorkspaces(updatedWorkspaces);

      setShowJoin(false);
      setShowActionModal(false);
      setWorkspace(joinedWorkspace.workspace_id);
    } catch (error) {
      console.error("Error joining workspace:", error);
      toast.error("Failed to join workspace. Please check the code and try again.");
    }
  };

  // User selection helpers
  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (user: User) => {
    setSelected((prev) =>
      prev.some((s) => s.id === user.id)
        ? prev.filter((s) => s.id !== user.id)
        : [...prev, user]
    );
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
      {/* Show main app only if workspace is selected */}
      {!showForcedWorkspaceSelection && (
        <>
          {/* TopBar */}
          <TopBar workspaceName={workspace} onWorkspace={setWorkspace} />

          <div className="w-full h-full flex px-6 py-4 gap-6">
            {/* Sidebar */}
            <aside className="w-[260px] shrink-0 sticky top-14 self-start">
              <Sidebar current={current} setCurrent={(k) => setCurrent(k as CalRoute)} />
            </aside>

            {/* Main content */}
            <main ref={mainContentRef} className="flex-1 w-full min-h-[calc(100vh-3.5rem)] overflow-auto">
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

                  <div className="relative">
                    <CalendarWeek
                      weekStart={weekStart}
                      events={events}
                      onEventClick={handleEventClick}
                      currentUserId={currentUserId}
                    />
                    {loading && (
                      <div className="absolute inset-0 z-10 flex items-start justify-center pt-20 pointer-events-none">
                        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-500"></div>
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Syncing events...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : current === "dashboard" ? (
                <Dashboard workspaceId={workspace} onOpenMessageThread={handleOpenMessageThread} />
              ) : current === "settings" ? (
                <Settings workspaceId={workspace} onLeaveWorkspace={handleLeaveWorkspace} />
              ) : current === "notes" ? (
                <Notes workspaceId={workspace} />
              ) : current === "tasks" ? (
                <Tasks />
              ) : current === "resources" ? (
                <Resources workspace={workspace} />
              ) : current === "message" ? (
                <MessageBoard openThreadMessageId={openThreadMessageId} />
              ) : current === "chat" ? (
                <>
                  <header className="mb-3">
                    <h1 className="text-2xl font-semibold">AI Chat</h1>
                  </header>
                  <Chat />
                </>
              ) : null}
            </main>

            {/* Agenda only for Calendar */}
            {current === "calendar" ? (
              <Agenda
                events={events}
                onEventClick={handleEventClick}
                calendarView={calendarView}
                onViewChange={setCalendarView}
                currentUserId={currentUserId}
              />
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
            currentUserId={currentUserUUID}
          />

          <UnavailabilityModal
            open={showBlock}
            onClose={() => setShowBlock(false)}
            onBlocked={handleBlocked}
          />

          {/* Event details modal */}
          <EventDetailsModal
            open={selectedEventForDetails !== null}
            onClose={() => setSelectedEventForDetails(null)}
            event={selectedEventForDetails}
            currentUserId={currentUserId}
            onDelete={handleDeleteEvent}
            onRsvpChange={refreshEvents}
            onEventUpdate={handleEventUpdate}
          />
        </>
      )}

      {/* Forced workspace selection modals for new users */}
      {showForcedWorkspaceSelection && (
        <>
          {/* Workspace Action Selection Modal - cannot be closed */}
          <WorkspaceActionModal
            open={showActionModal}
            onClose={() => { }} // Cannot close - must select an option
            onCreateWorkspace={() => {
              setShowActionModal(false);
              setShowCreate(true);
            }}
            onJoinWorkspace={() => {
              setShowActionModal(false);
              setShowJoin(true);
            }}
          />

          {/* Create Workspace Modal */}
          <Modal
            open={showCreate}
            onClose={() => {
              setShowCreate(false);
              setShowActionModal(true); // Go back to action modal
            }}
            title="Create New Workspace"
          >
            <div className="space-y-4 p-1">
              <div>
                <label className="text-sm font-medium">Workspace Name</label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="Briefly describe this workspace"
                  className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Add Members (Optional)</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name"
                  className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                />
                <div className="mt-2 max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                  {filtered.map((user) => {
                    const selectedUser = selected.some((s) => s.id === user.id);
                    return (
                      <button
                        key={user.user_id}
                        onClick={() => toggleSelect(user)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${selectedUser
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          }`}
                      >
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{user.email}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCreateWorkspace}
                disabled={!wsName.trim()}
                className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-2 text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Workspace
              </button>
            </div>
          </Modal>

          {/* Join Workspace Modal */}
          <JoinWorkspaceModal
            open={showJoin}
            onClose={() => {
              setShowJoin(false);
              setShowActionModal(true); // Go back to action modal
            }}
            onJoin={handleJoinWorkspace}
          />
        </>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border-zinc-200 dark:border-zinc-800',
            title: 'text-sm font-medium',
            description: 'text-sm text-zinc-600 dark:text-zinc-400',
            success: 'bg-white dark:bg-zinc-900',
            error: 'bg-white dark:bg-zinc-900',
            info: 'bg-white dark:bg-zinc-900',
          },
        }}
      />
    </div>
  );
}
