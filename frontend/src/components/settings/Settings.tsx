import { useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export function Settings({
  workspaceId,
  onLeaveWorkspace,
}: {
  workspaceId: string;
  onLeaveWorkspace: (id: string) => void;
}) {
  const { logout } = useAuth0();
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [notifications, setNotifications] = useState(true);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangePassword = () => {
    alert("Password change flow will be implemented here.");
  };

  const handleLeaveWorkspace = () => {
    if (
      window.confirm(
        "Are you sure you want to leave this workspace? You will lose access to its calendar and resources."
      )
    ) {
      onLeaveWorkspace(workspaceId);
    }
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePic(imageUrl);
    }
  };

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>

      {/* Profile Picture */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-lg font-medium overflow-hidden cursor-pointer"
          onClick={handleProfilePicClick}
          title="Click to change profile picture"
        >
          {profilePic ? (
            <img
              src={profilePic}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            name[0]
          )}
        </div>
        <div>
          <p className="text-sm text-zinc-500">Profile Picture</p>
          <button
            onClick={handleProfilePicClick}
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 underline hover:opacity-80"
          >
            Change
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleProfilePicUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {/* Email with Edit */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Email</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
          />
          <button className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Edit
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="mb-4">
        <button
          onClick={handleChangePassword}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Change Password
        </button>
      </div>

      {/* Notifications */}
      <div className="mb-8 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
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