import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { Workspace } from "./WorkspaceSwitcher";
import { fetchWorkspaceList, createWorkspace, fetchAllUsers, joinWorkspace } from "../../lib/api";
import { Modal } from "../modals/Modal";
import { WorkspaceActionModal } from "../modals/WorkspaceActionModal";
import { JoinWorkspaceModal } from "../modals/JoinWorkspaceModal";
import type { User } from '../../lib/api';


function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("cd.theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("cd.theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("cd.theme", "light");
    }
  }, [isDark]);

  return { isDark, setIsDark };
}

export function TopBar({
  workspaceName,
  onWorkspace,
}: {
  workspaceName: string;
  onWorkspace: (id: string) => void;
}) {
  const { isDark, setIsDark } = useDarkMode();
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
  const { user, isAuthenticated, isLoading } = useAuth0();

  // Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);

useEffect(() => {
  const loadUsers = async () => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🟢 Attempt ${attempt}: Fetching all users...`);
        const data = await fetchAllUsers();
        setUsers(data);
        return; // Exit after success
      } catch (error) {
        console.error(`⚠️ Attempt ${attempt} failed:`, error);
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Retrying in ${RETRY_DELAY / 1000}s...`);
          await new Promise((res) => setTimeout(res, RETRY_DELAY));
        } else {
          console.error("❌ Failed to fetch users after retries.");
        }
      }
    }
  };

  loadUsers();
}, []);

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

const handleCreateWorkspace = async () => {
  try {
    console.log("Selected users:", selected);
    console.log("Mapped IDs:", selected.map((u) => u.id));

    const payload = {
      name: wsName,
      description: wsDesc,
      members: [], // change this later
    };
    const newWorkspace = await createWorkspace(payload);
    console.log("Workspace created:", newWorkspace);

    // update UI or local state
    setShowCreate(false);
    onWorkspace(newWorkspace.workspace_id);
  } catch (error) {
    console.error("Error creating workspace:", error);
    alert("Failed to create workspace. Please try again.");
  }
};

const handleJoinWorkspace = async (code: string) => {
  try {
    const workspace = await joinWorkspace(code);
    console.log("Joined workspace:", workspace);

    setShowJoin(false);
    onWorkspace(workspace.workspace_id);
  } catch (error) {
    console.error("Error joining workspace:", error);
    alert("Failed to join workspace. Please check the code and try again.");
  }
};



  // Fetch workspace names on mount - only when authenticated
  useEffect(() => {
    if (isLoading) {
      console.log("TopBar: Auth0 still loading...");
      return; // Wait for Auth0 to finish checking
    }
    if (!isAuthenticated) {
      console.log("TopBar: User not authenticated, skipping workspace fetch");
      return; // Don't fetch if not authenticated
    }

    // Add a small delay to ensure token getter is ready
    console.log("TopBar: User authenticated, waiting for token getter...");
    const timer = setTimeout(() => {
      console.log("TopBar: Fetching workspaces...");
      async function fetchWorkspaces() {
        try {
          const data = await fetchWorkspaceList();
          const formatted = data.map((w) => ({
            id: w.workspace_id,
            name: w.name,
          }));
          console.log("Workspaces fetched:", formatted);
          setWorkspaceList(formatted);
        } catch (error) {
          console.error("Error fetching workspaces:", error);
        }
      }
      fetchWorkspaces();
    }, 100); // Small delay to let token getter initialize

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="text-xl font-semibold tracking-tight">CollabDesk</div>

          {/* Workspace switcher + Add button */}
          <div className="ml-2 flex items-center gap-2">
            <WorkspaceSwitcher
              value={workspaceName}
              onChange={onWorkspace}
              workspaces={workspaceList}
            />

            {/* Add Workspace Button (circle with +) */}
            <button
              onClick={() => setShowActionModal(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 text-lg font-medium leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Add Workspace"
            >
              +
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{user?.name}</span>
          </div>

          {/* Dark mode toggle */}
          <div className="ml-auto">
            <button
              onClick={() => setIsDark(!isDark)}
              className="rounded-2xl border border-zinc-200 px-3 py-1.5 text-sm shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              aria-label="Toggle dark mode"
            >
              {isDark ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Action Selection Modal */}
      <WorkspaceActionModal
        open={showActionModal}
        onClose={() => setShowActionModal(false)}
        onCreateWorkspace={() => setShowCreate(true)}
        onJoinWorkspace={() => setShowJoin(true)}
      />

      {/* Create Workspace Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
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
            <label className="text-sm font-medium">Add Members</label>
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
        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150
          ${
            selectedUser
              ? // 🟦 Permanent highlight when selected
                "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
              : // 🩶 Hover only for unselected
                "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          }`}
      >
        <span className="font-medium">{user.full_name}</span>
        <span className="text-xs text-gray-500 ml-2">{user.email}</span>
      </button>
    );
  })}
</div>
            {/* <div className="mt-2 max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
              {filtered.map((user) => {
                const selectedUser = selected.some((s) => s.id === user.id);
                return (
                <button
                key={user.user_id}
                onClick={() => toggleSelect(user)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  selectedUser ? "bg-zinc-200 dark:bg-zinc-700" : ""
                }`}
                >
                  {user.full_name}
                  <span className="text-xs text-gray-500 ml-2">{user.email}</span>
                  </button>
                  );
                  })}
            </div> */}
          </div>

          <button
            onClick={handleCreateWorkspace}
            className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-2 text-sm font-medium hover:opacity-90 transition-colors"
          >
            Create Workspace
          </button>
        </div>
      </Modal>

      {/* Join Workspace Modal */}
      <JoinWorkspaceModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={handleJoinWorkspace}
      />
    </>
  );
}