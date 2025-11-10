import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchCurrentUser, fetchWorkspaceInformation, deleteWorkspace, leaveWorkspace, type Workspace } from "../../lib/api";


export function Settings({
  workspaceId,
  onLeaveWorkspace,
}: {
  workspaceId: string;
  onLeaveWorkspace: (id: string) => void;
}) {
  const { logout, isAuthenticated } = useAuth0();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);


  // Fetch current user data from backend
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadUserData = async () => {
      try {
        setLoading(true);
        const userData = await fetchCurrentUser();
        setName(userData.full_name || "");
        setEmail(userData.email || "");
        setProfilePic(userData.profile_picture);
        setCurrentUserId(userData.id);
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, currentUserId]);

  // Fetch workspace information for invite code
  useEffect(() => {
    if (!isAuthenticated || !workspaceId) return;

    const loadWorkspaceData = async () => {
      try {
        const workspaceData = await fetchWorkspaceInformation(workspaceId);
        setWorkspace(workspaceData);
      } catch (error) {
        console.error("Failed to load workspace data:", error);
      }
    };
    loadWorkspaceData();
  }, [isAuthenticated, workspaceId]);

  // Invite Code implementation
  const handleCopyInviteCode = () => {
    if (workspace?.invite_code) {
      navigator.clipboard.writeText(workspace.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


// Delete Workspace with particular workspace_id 
const handleDeleteWorkspace = async () => {
  if (!workspace) return;

  if (
    window.confirm(
      "Are you sure you want to DELETE this workspace? This will permanently delete the workspace and ALL its data for EVERYONE. This action cannot be undone."
    )
  ) {
    try {
      await deleteWorkspace(workspace.workspace_id);

      alert("Workspace deleted successfully!");

      // clear local state (optional)
      setWorkspace(null);

      // redirect to dashboard
       window.location.href = "/";

    } catch (error) {
      console.error("Error deleting workspace:", error);
      alert("Failed to delete workspace. Please try again later.");
    }
  }
};


const handleLeaveWorkspace = async () => {
  const confirmed = window.confirm(
    "Are you sure you want to leave this workspace? You will lose access to its calendar and resources."
  );

  if (!confirmed) return;

  try {
    await leaveWorkspace(workspaceId);
    alert("You have left the workspace successfully.");
    // optionally refresh the workspace list or redirect
    onLeaveWorkspace(workspaceId);
    // redirect to dashboard
    window.location.href = "/";
  } catch (error) {
    console.error("Error leaving workspace:", error);
    alert("Failed to leave workspace. Please try again.");
  }
};

  if (loading) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="text-center py-8 text-zinc-500">Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-8 space-y-6">
      {/* User Settings */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Settings</h2>

        {/* Profile Picture */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-medium text-white overflow-hidden">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              name ? name[0].toUpperCase() : "?"
            )}
          </div>
          <div>
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">{name || "User"}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
          <label className="text-sm font-medium">Enable Notifications</label>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-11 h-6 rounded-full transition-colors ${
              notifications
                ? "bg-zinc-900 dark:bg-zinc-100"
                : "bg-zinc-300 dark:bg-zinc-700"
            } relative`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-black transform transition-transform ${
                notifications ? "translate-x-5" : "translate-x-0"
              }`}
            ></span>
          </button>
        </div>
      </div>

      {/* Workspace Information */}
      {workspace && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Workspace Information</h3>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Invite Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-center font-mono text-2xl tracking-widest">
                {workspace.invite_code || "N/A"}
              </div>
              {workspace.invite_code && (
                <button
                  onClick={handleCopyInviteCode}
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-2"
                  title="Copy invite code"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Share this code with others to invite them to your workspace
            </p>
          </div>
        </div>
      )}
      {/* Workspace Delete Actions */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Workspace Actions</h3>

        <div className="space-y-3">
          {workspace?.owner?.id === currentUserId && (
          <button
            onClick={handleDeleteWorkspace}
            className="w-full rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Workspace
          </button>)}

          {/* Leave workspace*/}

    {/* Show only if the current user is NOT the owner */}
    {workspace?.owner?.id !== currentUserId && (
      <button
        onClick={handleLeaveWorkspace}
        className="w-full rounded-md border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 py-2 text-sm font-medium transition flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Leave Workspace
      </button>
       )}

        </div>
      </div>

      {/* Account Actions */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Account</h3>

        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}