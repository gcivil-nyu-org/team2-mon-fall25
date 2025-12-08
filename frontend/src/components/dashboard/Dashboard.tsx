import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { WorkspaceInfoCard } from "./WorkspaceInfoCard";
import { UpcomingEventsCard } from "./UpcomingEventsCard";
import { LatestResourcesCard } from "./LatestResourcesCard";
import { fetchWorkspaceInformation, fetchCurrentUser, fetchUpcomingEvents, fetchLatestResources, type Workspace } from "../../lib/api";
import { getMessages, formatRelativeTime, type Message } from "../messageboard/MessageBoardApi";

export function Dashboard({
  workspaceId,
  onOpenMessageThread
}: {
  workspaceId: string;
  onOpenMessageThread?: (messageId: string) => void;
}) {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [latestResources, setLatestResources] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);

  // Fetch current user ID
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const loadCurrentUser = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUserId(user.id);
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };

    loadCurrentUser();
  }, [isAuthenticated, authLoading]);

  // Fetch latest resources
useEffect(() => {
  if (!isAuthenticated) return;

  const loadResources = async () => {
    try {
      const data = await fetchLatestResources();
      setLatestResources(data);
    } catch (err) {
      console.error("Failed to fetch latest resources:", err);
    }
  };

  loadResources();
}, [isAuthenticated]);

// Fetch latest 3 events for the dashboard
useEffect(() => {
  if (!isAuthenticated) return;

  const loadEvents = async () => {
    try {
      const data = await fetchUpcomingEvents();
      setUpcomingEvents(data);
    } catch (err) {
      console.error("Failed to fetch latest events:", err);
    }
  };

  loadEvents();
}, [isAuthenticated]);


  useEffect(() => {
    if (authLoading) return; // Wait for Auth0 to finish checking
    if (!isAuthenticated) {
      setLoading(false);
      return; // Don't fetch if not authenticated
    }
    if (!workspaceId) return;

    console.log("🔁 Fetching workspace info for:", workspaceId);
    setLoading(true);
    setError("");

    const tokenProvider = () => getAccessTokenSilently();

    fetchWorkspaceInformation(workspaceId, tokenProvider)
      .then((data) => {
        setWorkspace(data);
      })
      .catch((err) => {
        console.error("Error fetching workspace:", err);
        setError("Failed to load workspace.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, isAuthenticated, authLoading, getAccessTokenSilently]);

  // Fetch recent messages
  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        const token = await getAccessTokenSilently();
        const messages = await getMessages(token);
        // Get only parent messages, sort by timestamp descending, take latest 3
        const parentMessages = messages
          .filter((m) => m.parentId === null)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);
        setRecentMessages(parentMessages);
      } catch (error) {
        console.error("Failed to load recent messages:", error);
      }
    };
    loadRecentMessages();
  }, [getAccessTokenSilently, workspaceId]);

  const handleWorkspaceUpdate = (updatedWorkspace: Workspace) => {
    setWorkspace(updatedWorkspace);
  };

  if (loading) return <div className="p-6">Loading workspace...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!workspace) return null;

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <WorkspaceInfoCard
        workspace={workspace}
        currentUserId={currentUserId}
        onWorkspaceUpdate={handleWorkspaceUpdate}
      />

      {/* Events + Resources side-by-side */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <UpcomingEventsCard events={upcomingEvents} />
        <LatestResourcesCard resources={latestResources} />
      </div>


      {/* Recent Messages Section */}
      {recentMessages.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Messages
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => onOpenMessageThread?.(message.id)}
                className="w-full px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors text-left cursor-pointer"
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {message.author.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {message.author}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatRelativeTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                      {message.content}
                    </p>
                    {message.replyCount > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        <span>{message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No members modal yet since API doesn't return members */}
    </div>
  );
}