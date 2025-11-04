import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchCurrentUser } from "../../lib/api";

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
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated]);

  const handleLeaveWorkspace = () => {
    if (
      window.confirm(
        "Are you sure you want to leave this workspace? You will lose access to its calendar and resources."
      )
    ) {
      onLeaveWorkspace(workspaceId);
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
    <div className="max-w-xl mx-auto mt-8 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>

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
      <div className="mb-8 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
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

      {/* Leave Workspace */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        <button
          onClick={handleLeaveWorkspace}
          className="w-full rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-medium transition"
        >
          Leave Workspace
        </button>

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